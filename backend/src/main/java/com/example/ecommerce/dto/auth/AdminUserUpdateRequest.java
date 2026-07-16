package com.example.ecommerce.dto.auth;

import com.example.ecommerce.entity.auth.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminUserUpdateRequest {

    @Email(message = "Email khong hop le")
    private String email;

    @Size(max = 100, message = "Ho va ten toi da 100 ky tu")
    private String fullName;

    @Size(max = 20, message = "So dien thoai toi da 20 ky tu")
    private String phoneNumber;

    @Size(max = 255, message = "Dia chi toi da 255 ky tu")
    private String address;

    private Role role;

    private Boolean enabled;
}
