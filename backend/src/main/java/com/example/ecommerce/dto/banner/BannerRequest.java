package com.example.ecommerce.dto.banner;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BannerRequest {
    @NotBlank
    private String title;
    private String subtitle;
    private String imageUrl;
    private String linkUrl;
    private Boolean active;
    private Integer sortOrder;
}
