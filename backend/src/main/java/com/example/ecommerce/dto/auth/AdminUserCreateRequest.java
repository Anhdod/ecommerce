package com.example.ecommerce.dto.auth;

import com.example.ecommerce.entity.auth.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AdminUserCreateRequest {

    @NotBlank(message = "Username khong duoc de trong")
    @Size(min = 3, max = 50, message = "Username phai tu 3 den 50 ky tu")
    private String username;

    @NotBlank(message = "Mat khau khong duoc de trong")
    @Size(min = 6, max = 100, message = "Mat khau phai tu 6 den 100 ky tu")
    private String password;

    @NotBlank(message = "Email khong duoc de trong")
    @Email(message = "Email khong hop le")
    private String email;

    @Size(max = 100, message = "Ho va ten toi da 100 ky tu")
    private String fullName;

    @Size(max = 20, message = "So dien thoai toi da 20 ky tu")
    private String phoneNumber;

    @Size(max = 255, message = "Dia chi toi da 255 ky tu")
    private String address;

    private Role role = Role.USER;
    private Boolean enabled = true;
}
