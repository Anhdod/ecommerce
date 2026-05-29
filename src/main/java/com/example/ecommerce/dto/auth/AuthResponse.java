package com.example.ecommerce.dto.auth;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private boolean success;
    private String message;
    private String token;
    private String username;
    private String fullName;
    private String role;
}