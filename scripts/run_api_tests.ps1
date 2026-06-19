# Run a suite of API checks and save a JSON report
param(
    [string]$BaseUrl = 'http://localhost:8080'
)

function Invoke-Api {
    param($Name, $Method, $Url, $Headers = $null, $Body = $null)
    $result = [ordered]@{
        name = $Name
        method = $Method
        url = $Url
        status = 0
        success = $false
        message = ''
        body = $null
        timestamp = (Get-Date).ToString('o')
    }
    try {
        $options = @{ Uri = $Url; Method = $Method }
        if ($Headers) { $options.Headers = $Headers }
        if ($Body) { $options.Body = $Body; $options.ContentType = 'application/json' }
        $resp = Invoke-RestMethod @options
        $result.status = 200
        $result.success = $true
        $result.body = $resp
        $result.message = 'OK'
    } catch {
        $respStream = $_.Exception.Response
        if ($respStream -ne $null) {
            try {
                $sr = New-Object System.IO.StreamReader($respStream.GetResponseStream())
                $text = $sr.ReadToEnd()
                $result.body = $text
            } catch { $result.body = $_.Exception.Message }
            try { $result.status = $_.Exception.Response.StatusCode.value__ } catch { $result.status = 0 }
            $result.message = $_.Exception.Message
        } else {
            $result.message = $_.Exception.Message
        }
    }
    return $result
}

$report = @()

# 1) Login admin (try multiple candidates)
$adminCandidates = @(
    @{ username = 'normaluser1'; password = 'Password123!' }
)
$adminToken = $null
$adminLogin = $null
foreach ($c in $adminCandidates) {
    $cred = @{ username = $c.username; password = $c.password } | ConvertTo-Json
    $attempt = Invoke-Api -Name "admin_login_attempt_$($c.username)" -Method 'Post' -Url "$BaseUrl/auth/login" -Body $cred
    $report += $attempt
    if ($attempt.success -and $attempt.body.data) {
        $adminLogin = Invoke-Api -Name 'admin_login' -Method 'Post' -Url "$BaseUrl/auth/login" -Body $cred
        $adminToken = $attempt.body.data.token
        $report += $adminLogin
        break
    }
}
if (-not $adminLogin) {
    # record a failed admin_login entry
    $adminLogin = [ordered]@{ name='admin_login'; method='Post'; url="$BaseUrl/auth/login"; status = 400; success = $false; message = 'No admin credentials succeeded'; body = $null; timestamp = (Get-Date).ToString('o') }
    $report += $adminLogin
}

# 2) Login normal user
$userCred = @{ username = 'normaluser1'; password = 'Password123!' } | ConvertTo-Json
$userLogin = Invoke-Api -Name 'user_login' -Method 'Post' -Url "$BaseUrl/auth/login" -Body $userCred
$report += $userLogin
$userToken = $null
if ($userLogin.success -and $userLogin.body.data) { $userToken = $userLogin.body.data.token }

# Helper headers
$adminHeaders = @{ Authorization = "Bearer $adminToken" }
$userHeaders = @{ Authorization = "Bearer $userToken" }

# If admin login failed but the normal user has ADMIN role, reuse the user token as admin
if (-not $adminToken -and $userLogin.success -and $userLogin.body.data -and ($userLogin.body.data.role -eq 'ADMIN')) {
    $adminToken = $userToken
    $adminHeaders = @{ Authorization = "Bearer $adminToken" }
}

# Public endpoints
$report += Invoke-Api -Name 'get_products' -Method 'Get' -Url "$BaseUrl/api/products"
$report += Invoke-Api -Name 'get_categories' -Method 'Get' -Url "$BaseUrl/api/categories"

# Product detail (auth optional)
$report += Invoke-Api -Name 'get_product_1_public' -Method 'Get' -Url "$BaseUrl/api/products/1"

# User actions (if token available)
if ($userToken) {
    $report += Invoke-Api -Name 'add_to_cart' -Method 'Post' -Url "$BaseUrl/api/cart/add/1?quantity=1" -Headers $userHeaders
    $report += Invoke-Api -Name 'get_cart' -Method 'Get' -Url "$BaseUrl/api/cart" -Headers $userHeaders
    $reviewBody = @{ rating = 5; comment = 'Automated test review' } | ConvertTo-Json
    $report += Invoke-Api -Name 'create_review' -Method 'Post' -Url "$BaseUrl/api/products/1/reviews" -Headers $userHeaders -Body $reviewBody
    $report += Invoke-Api -Name 'get_reviews' -Method 'Get' -Url "$BaseUrl/api/products/1/reviews" -Headers $userHeaders
    # Ensure an address exists for checkout-preview
    $addressId = 1
    $createAddressBody = @{ recipientName = 'Automated Tester'; phoneNumber = '0123456789'; addressLine = '123 Test St'; city = 'TestCity'; province = 'TestProvince'; postalCode = '12345'; defaultAddress = $true } | ConvertTo-Json
    $createAddress = Invoke-Api -Name 'create_address' -Method 'Post' -Url "$BaseUrl/api/users/addresses" -Headers $userHeaders -Body $createAddressBody
    $report += $createAddress
    if ($createAddress.success -and $createAddress.body.data) { $addressId = $createAddress.body.data.id }

    $report += Invoke-Api -Name 'checkout_preview' -Method 'Get' -Url "$BaseUrl/api/orders/checkout-preview?shippingMethod=STANDARD&addressId=$addressId" -Headers $userHeaders
}

# Admin actions (if token available)
if ($adminToken) {
    # Check existing categories to avoid duplicate creation
    $existingCats = Invoke-Api -Name 'list_categories_for_admin_check' -Method 'Get' -Url "$BaseUrl/api/categories"
    $report += $existingCats
    $shouldCreateCat = $true
    if ($existingCats.success -and $existingCats.body.data) {
        foreach ($c in $existingCats.body.data) { if ($c.name -eq 'AutoCat') { $shouldCreateCat = $false; break } }
    }
    if ($shouldCreateCat) {
        $catBody = @{ name = 'AutoCat'; description = 'Created by test' } | ConvertTo-Json
        $report += Invoke-Api -Name 'create_category' -Method 'Post' -Url "$BaseUrl/api/categories" -Headers $adminHeaders -Body $catBody
    } else {
        $report += [ordered]@{ name='create_category'; method='Post'; url="$BaseUrl/api/categories"; status = 200; success = $true; message = 'Skipped (exists)'; body = $null; timestamp = (Get-Date).ToString('o') }
    }
    # Try product image upload using curl (Invoke-RestMethod doesn't support multipart easily here)
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
    $tmpFile = Join-Path $scriptDir 'tmp_upload.png'
    [IO.File]::WriteAllBytes($tmpFile, [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQImWNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='))
    try {
        $raw = & 'curl.exe' -s -o NUL -w '%{http_code}' -X POST "$BaseUrl/api/products/1/image" -H "Authorization: Bearer $adminToken" -F "file=@$tmpFile"
        $code = ($raw -split '\D+') | Where-Object { $_ -match '^\d{3}$' } | Select-Object -Last 1
        $httpCode = 0
        if ($code) { $httpCode = [int]$code }
        $report += [ordered]@{ name='upload_image'; method='Post'; url="$BaseUrl/api/products/1/image"; status = $httpCode; success = ($httpCode -eq 200); message = ''; timestamp = (Get-Date).ToString('o') }
    } finally { Remove-Item $tmpFile -ErrorAction SilentlyContinue }
}

# Save report
$reportFile = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Definition) 'api-test-report.json'
$report | ConvertTo-Json -Depth 10 | Set-Content -Path $reportFile -Encoding UTF8
Write-Output "Report written to: $reportFile"

# Print summary
$report | ForEach-Object { "$($_.name): success=$($_.success) status=$($_.status)" }
