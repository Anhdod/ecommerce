package com.example.ecommerce.entity.product;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

import com.example.ecommerce.entity.auth.User;

@Entity
@Table(name = "product_reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private int rating; // 1 - 5 sao

    @Column(length = 1000)
    private String comment;

    @Column(length = 255)
    private String imageUrl;

    @Builder.Default
    @Column(nullable = false)
    private boolean hidden = false;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
