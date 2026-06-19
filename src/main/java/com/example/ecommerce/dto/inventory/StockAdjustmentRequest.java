package com.example.ecommerce.dto.inventory;

import com.example.ecommerce.entity.inventory.StockMovementType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockAdjustmentRequest {

    @NotNull
    private Integer quantityChange;

    @NotNull
    private StockMovementType movementType;

    private String reason;
    private String note;
}
