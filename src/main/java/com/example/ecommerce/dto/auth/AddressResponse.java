package com.example.ecommerce.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddressResponse {

    private Long id;
    private String label;
    private String recipientName;
    private String phoneNumber;
    private String addressLine;
    private String city;
    private String province;
    private String postalCode;
    private Boolean defaultAddress;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
