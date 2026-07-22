package com.example.ecommerce.dto.order;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShippingUpdateRequest {
    @NotBlank(message = "Đơn vị vận chuyển không được để trống")
    @Size(max = 100, message = "Đơn vị vận chuyển tối đa 100 ký tự")
    private String carrier;

    @NotBlank(message = "Mã vận đơn không được để trống")
    @Size(max = 120, message = "Mã vận đơn tối đa 120 ký tự")
    private String trackingCode;

    @FutureOrPresent(message = "Ngày giao dự kiến không được ở trong quá khứ")
    private LocalDate estimatedDeliveryDate;
}
