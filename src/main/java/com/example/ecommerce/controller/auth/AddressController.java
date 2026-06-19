package com.example.ecommerce.controller.auth;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.auth.AddressRequest;
import com.example.ecommerce.dto.auth.AddressResponse;
import com.example.ecommerce.service.auth.AddressService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users/addresses")
public class AddressController {

    @Autowired
    private AddressService addressService;

    @GetMapping
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<List<AddressResponse>>> getMyAddresses() {
        return ResponseEntity
                .ok(ApiResponse.success("Lấy danh sách địa chỉ thành công", addressService.getMyAddresses()));
    }

    @GetMapping("/{addressId}")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<AddressResponse>> getAddressById(@PathVariable Long addressId) {
        return ResponseEntity
                .ok(ApiResponse.success("Lấy địa chỉ thành công", addressService.getAddressById(addressId)));
    }

    @GetMapping("/default")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<AddressResponse>> getDefaultAddress() {
        return ResponseEntity
                .ok(ApiResponse.success("Lấy địa chỉ mặc định thành công", addressService.getDefaultAddress()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<AddressResponse>> createAddress(@Valid @RequestBody AddressRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Tạo địa chỉ thành công", addressService.createAddress(request)));
    }

    @PutMapping("/{addressId}")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<AddressResponse>> updateAddress(
            @PathVariable Long addressId,
            @Valid @RequestBody AddressRequest request) {
        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật địa chỉ thành công", addressService.updateAddress(addressId, request)));
    }

    @PutMapping("/{addressId}/default")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<AddressResponse>> setDefaultAddress(@PathVariable Long addressId) {
        return ResponseEntity.ok(
                ApiResponse.success("Đặt địa chỉ mặc định thành công", addressService.setDefaultAddress(addressId)));
    }

    @DeleteMapping("/{addressId}")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteAddress(@PathVariable Long addressId) {
        addressService.deleteAddress(addressId);
        return ResponseEntity.ok(ApiResponse.success("Xóa địa chỉ thành công", null));
    }
}

