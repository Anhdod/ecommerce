package com.example.ecommerce.dto.payment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaymentRejectionRequest {

    @NotBlank(message = "Vui lòng nhập lý do từ chối")
    @Size(max = 500, message = "Lý do từ chối không được vượt quá 500 ký tự")
    private String reason;
}
