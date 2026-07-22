package com.example.ecommerce.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetChallengeResponse {
    private int expiresInMinutes;
    private String demoCode;
}
