package com.example.ecommerce.dto.inventory;

import com.example.ecommerce.entity.inventory.StockMovementType;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockMovementResponse {

    private Long id;
    private Long productId;
    private String productName;
    private StockMovementType movementType;
    private int quantityChange;
    private int previousQuantity;
    private int newQuantity;
    private String reason;
    private String note;
    private String performedBy;
    private LocalDateTime createdAt;
}
