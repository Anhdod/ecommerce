package com.example.ecommerce.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddressRequest {

    private String label;

    @NotBlank
    private String recipientName;

    @NotBlank
    private String phoneNumber;

    @NotBlank
    private String addressLine;

    private String city;
    private String province;
    private String postalCode;

    private Boolean defaultAddress;
}
