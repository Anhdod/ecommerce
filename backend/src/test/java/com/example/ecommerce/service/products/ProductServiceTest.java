package com.example.ecommerce.service.products;

import com.example.ecommerce.dto.products.ProductRequest;
import com.example.ecommerce.dto.products.ProductResponse;
import com.example.ecommerce.entity.product.Category;
import com.example.ecommerce.entity.product.Product;
import com.example.ecommerce.repository.order.OrderItemRepository;
import com.example.ecommerce.repository.products.CategoryRepository;
import com.example.ecommerce.repository.products.ProductRepository;
import com.example.ecommerce.repository.products.ProductVariantRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductVariantRepository productVariantRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private ProductLikeService productLikeService;
    @Mock
    private ProductReviewService reviewService;
    @Mock
    private OrderItemRepository orderItemRepository;

    @InjectMocks
    private ProductService productService;

    @Test
    void createProductNormalizesBrandAndRemovesDuplicateColors() {
        Category category = Category.builder().id(2L).name("Phones").build();
        ProductRequest request = request();
        request.setBrand("  Samsung  ");
        request.setColors(List.of("Đen", " Đen ", "Xanh"));
        when(categoryRepository.findById(2L)).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> {
            Product product = invocation.getArgument(0);
            product.setId(10L);
            return product;
        });

        ProductResponse response = productService.createProduct(request);

        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getBrand()).isEqualTo("Samsung");
        assertThat(response.getColors()).containsExactly("Đen", "Xanh");
        assertThat(response.isActive()).isTrue();
        assertThat(response.getCategoryName()).isEqualTo("Phones");
    }

    @Test
    void createProductRequiresCategoryId() {
        ProductRequest request = request();
        request.setCategoryId(null);

        assertThatThrownBy(() -> productService.createProduct(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("categoryId");
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    void createProductRejectsMissingCategory() {
        ProductRequest request = request();
        when(categoryRepository.findById(2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.createProduct(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Khong tim thay danh muc");
    }

    @Test
    void updateProductChangesEditableFieldsAndKeepsImageWhenOmitted() {
        Category category = Category.builder().id(2L).name("Phones").build();
        Product product = Product.builder()
                .id(10L)
                .name("Old phone")
                .price(new BigDecimal("100000"))
                .costPrice(new BigDecimal("70000"))
                .stockQuantity(2)
                .imageUrl("/uploads/products/old.jpg")
                .colors(new ArrayList<>(List.of("Đen")))
                .category(category)
                .active(true)
                .build();
        ProductRequest request = request();
        request.setName("New phone");
        request.setPrice(new BigDecimal("300000"));
        request.setStockQuantity(8);
        request.setImageUrl(null);
        request.setColors(List.of("Trắng"));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(categoryRepository.findById(2L)).thenReturn(Optional.of(category));
        when(productRepository.save(product)).thenReturn(product);

        ProductResponse response = productService.updateProduct(10L, request);

        assertThat(response.getName()).isEqualTo("New phone");
        assertThat(response.getPrice()).isEqualByComparingTo("300000");
        assertThat(response.getStockQuantity()).isEqualTo(8);
        assertThat(response.getImageUrl()).isEqualTo("/uploads/products/old.jpg");
        assertThat(response.getColors()).containsExactly("Trắng");
    }

    @Test
    void deleteProductPerformsSoftDelete() {
        Product product = Product.builder().id(10L).active(true).build();
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));

        productService.deleteProduct(10L);

        assertThat(product.isActive()).isFalse();
        verify(productRepository).save(product);
    }

    private ProductRequest request() {
        return ProductRequest.builder()
                .name("Galaxy Phone")
                .description("Flagship phone")
                .price(new BigDecimal("250000"))
                .costPrice(new BigDecimal("180000"))
                .stockQuantity(5)
                .categoryId(2L)
                .imageUrl("/uploads/products/phone.jpg")
                .brand("Samsung")
                .warrantyMonths(12)
                .colors(List.of("Đen"))
                .featured(true)
                .build();
    }
}
