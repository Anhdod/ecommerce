package com.example.ecommerce.dto.payment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RefundRequest {

    @NotBlank(message = "Vui lòng nhập lý do hoàn tiền")
    @Size(max = 500, message = "Lý do hoàn tiền không được vượt quá 500 ký tự")
    private String reason;
}
