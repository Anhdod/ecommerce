package com.example.ecommerce.config;

import com.example.ecommerce.entity.product.Category;
import com.example.ecommerce.entity.product.Product;
import com.example.ecommerce.repository.products.CategoryRepository;
import com.example.ecommerce.repository.products.ProductRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Configuration
public class DemoDataInitializer {

    private static final String IMAGE_PARAMS = "?auto=format&fit=crop&w=900&q=80";

    @Bean
    public CommandLineRunner seedDemoProducts(CategoryRepository categoryRepository,
                                              ProductRepository productRepository,
                                              TransactionTemplate transactionTemplate) {
        return args -> transactionTemplate.executeWithoutResult(status -> {
            Map<String, Category> categories = ensureCategories(categoryRepository);
            ensureProducts(productRepository, categories);
        });
    }

    private Map<String, Category> ensureCategories(CategoryRepository categoryRepository) {
        Map<String, Category> categories = categoryRepository.findAll().stream()
                .collect(Collectors.toMap(
                        category -> normalize(category.getName()),
                        Function.identity(),
                        (first, ignored) -> first,
                        LinkedHashMap::new));

        List<CategorySeed> seeds = List.of(
                new CategorySeed("Phones", "Điện thoại thông minh và thiết bị di động", true),
                new CategorySeed("Laptops", "Laptop cho học tập, làm việc và sáng tạo", true),
                new CategorySeed("Audio", "Tai nghe, loa và thiết bị âm thanh", true),
                new CategorySeed("Tablets", "Máy tính bảng cho công việc và giải trí", true),
                new CategorySeed("Smartwatches", "Đồng hồ thông minh và thiết bị theo dõi sức khỏe", true),
                new CategorySeed("Accessories", "Phụ kiện công nghệ và thiết bị ngoại vi", false),
                new CategorySeed("Gaming", "Máy chơi game, tay cầm và phụ kiện gaming", true)
        );

        for (CategorySeed seed : seeds) {
            categories.computeIfAbsent(normalize(seed.name()), ignored -> categoryRepository.save(
                    Category.builder()
                            .name(seed.name())
                            .description(seed.description())
                            .featured(seed.featured())
                            .build()));
        }
        return categories;
    }

    private void ensureProducts(ProductRepository productRepository, Map<String, Category> categories) {
        Map<String, Product> existingProducts = productRepository.findAll().stream()
                .collect(Collectors.toMap(
                        product -> normalize(product.getName()),
                        Function.identity(),
                        (first, ignored) -> first));

        for (ProductSeed seed : productSeeds()) {
            Product existing = existingProducts.get(normalize(seed.name()));
            if (existing == null) {
                Product created = productRepository.save(createProduct(seed, categories.get(normalize(seed.category()))));
                existingProducts.put(normalize(created.getName()), created);
            } else if (fillMissingDetails(existing, seed, categories.get(normalize(seed.category())))) {
                productRepository.save(existing);
            }
        }
    }

    private boolean fillMissingDetails(Product product, ProductSeed seed, Category category) {
        boolean changed = false;
        if (product.getDescription() == null || product.getDescription().isBlank()) {
            product.setDescription(seed.description());
            changed = true;
        }
        if (product.getImageUrl() == null || product.getImageUrl().isBlank()) {
            product.setImageUrl(seed.imageUrl());
            changed = true;
        }
        if (product.getImageUrls() == null || product.getImageUrls().isEmpty()) {
            product.setImageUrls(new ArrayList<>(seed.galleryImages()));
            changed = true;
        }
        if (product.getBrand() == null || product.getBrand().isBlank()) {
            product.setBrand(seed.brand());
            changed = true;
        }
        if (product.getWarrantyMonths() == null) {
            product.setWarrantyMonths(seed.warrantyMonths());
            changed = true;
        }
        if (product.getColors() == null || product.getColors().isEmpty()) {
            product.setColors(new ArrayList<>(seed.colors()));
            changed = true;
        }
        if (product.getCostPrice() == null) {
            product.setCostPrice(costPrice(seed.price()));
            changed = true;
        }
        if (product.getCategory() == null && category != null) {
            product.setCategory(category);
            changed = true;
        }
        return changed;
    }

    private Product createProduct(ProductSeed seed, Category category) {
        BigDecimal salePrice = new BigDecimal(seed.price());
        return Product.builder()
                .name(seed.name())
                .description(seed.description())
                .price(salePrice)
                .costPrice(costPrice(seed.price()))
                .stockQuantity(seed.stockQuantity())
                .imageUrl(seed.imageUrl())
                .imageUrls(new ArrayList<>(seed.galleryImages()))
                .brand(seed.brand())
                .warrantyMonths(seed.warrantyMonths())
                .colors(new ArrayList<>(seed.colors()))
                .category(category)
                .active(true)
                .featured(seed.featured())
                .build();
    }

    private BigDecimal costPrice(String price) {
        return new BigDecimal(price).multiply(new BigDecimal("0.70")).setScale(0, RoundingMode.HALF_UP);
    }

    private List<ProductSeed> productSeeds() {
        return List.of(
                product("iPhone 15 Pro", "Điện thoại cao cấp với chip A17 Pro và camera chuyên nghiệp.", "24975000", 18,
                        image("photo-1695048133142-1a20484d2569"), image("photo-1592750475338-74b7b21085ab"),
                        "Phones", true, "Apple", 12, "Titan đen", "Titan xanh", "Titan tự nhiên"),
                product("Samsung Galaxy S24", "Flagship Android với màn hình sáng, camera AI và hiệu năng mạnh.", "22475000", 24,
                        image("photo-1610945265064-0e34e5519bbf"), image("photo-1598327105666-5b89351aff97"),
                        "Phones", true, "Samsung", 12, "Đen", "Tím", "Vàng"),
                product("Google Pixel 8 Pro", "Camera thông minh, Android thuần và nhiều tính năng AI hữu ích.", "20990000", 20,
                        image("photo-1598327105666-5b89351aff97"), image("photo-1511707171634-5f897ff02aa9"),
                        "Phones", false, "Google", 12, "Đen", "Xanh", "Trắng"),

                product("MacBook Air M3", "Laptop mỏng nhẹ cho công việc, học tập và phát triển phần mềm.", "29975000", 12,
                        image("photo-1517336714731-489689fd1ca8"), image("photo-1541807084-5c52b6b3adef"),
                        "Laptops", true, "Apple", 12, "Bạc", "Xám", "Xanh đêm"),
                product("Dell XPS 13", "Laptop Windows nhỏ gọn với thiết kế cao cấp và màn hình sắc nét.", "27475000", 15,
                        image("photo-1496181133206-80ce9b88a853"), image("photo-1588872657578-7efd1f1555ed"),
                        "Laptops", false, "Dell", 24, "Bạc", "Đen"),
                product("ASUS ROG Zephyrus G14", "Laptop gaming gọn nhẹ, màn hình đẹp và hiệu năng cao.", "38990000", 9,
                        image("photo-1603302576837-37561b2e2302"), image("photo-1593642632823-8f785ba67e45"),
                        "Laptops", true, "ASUS", 24, "Trắng", "Xám"),

                product("Sony WH-1000XM5", "Tai nghe không dây chống ồn cho du lịch và làm việc.", "8725000", 30,
                        image("photo-1618366712010-f4ae9c647dcb"), image("photo-1583394838336-acd977736f90"),
                        "Audio", true, "Sony", 12, "Đen", "Bạc"),
                product("AirPods Pro", "Tai nghe không dây nhỏ gọn với chống ồn chủ động.", "6225000", 40,
                        image("photo-1600294037681-c80b4cb5b434"), image("photo-1588423771073-b8903fbb85b5"),
                        "Audio", false, "Apple", 12, "Trắng"),
                product("JBL Charge 5", "Loa Bluetooth chống nước với âm trầm mạnh và pin lâu.", "3490000", 28,
                        image("photo-1608043152269-423dbba4e7e1"), image("photo-1589003077984-894e133dabab"),
                        "Audio", true, "JBL", 12, "Đen", "Xanh", "Đỏ"),

                product("iPad Pro M4", "Máy tính bảng hiệu năng cao với màn hình Ultra Retina XDR.", "28990000", 16,
                        image("photo-1544244015-0df4b3ffc6b0"), image("photo-1585790050230-5dd28404ccb9"),
                        "Tablets", true, "Apple", 12, "Bạc", "Đen"),
                product("Samsung Galaxy Tab S9", "Máy tính bảng Android cao cấp kèm bút S Pen tiện dụng.", "18990000", 19,
                        image("photo-1561154464-82e9adf32764"), image("photo-1589739900243-4b52cd9b104e"),
                        "Tablets", false, "Samsung", 12, "Xám", "Be"),
                product("Xiaomi Pad 6", "Máy tính bảng giải trí với màn hình 144 Hz và pin lớn.", "8990000", 25,
                        image("photo-1585790050230-5dd28404ccb9"), image("photo-1542751110-97427bbecf20"),
                        "Tablets", false, "Xiaomi", 18, "Xám", "Xanh", "Vàng"),

                product("Apple Watch Series 9", "Đồng hồ thông minh theo dõi sức khỏe và luyện tập hằng ngày.", "9990000", 22,
                        image("photo-1434493789847-2f02dc6ca35d"), image("photo-1551816230-ef5deaed4a26"),
                        "Smartwatches", true, "Apple", 12, "Đen", "Hồng", "Bạc"),
                product("Samsung Galaxy Watch6", "Đồng hồ Wear OS với màn hình AMOLED và đo thành phần cơ thể.", "6490000", 27,
                        image("photo-1523275335684-37898b6baf30"), image("photo-1508685096489-7aacd43bd3b1"),
                        "Smartwatches", false, "Samsung", 12, "Đen", "Bạc", "Vàng"),
                product("Garmin Venu 3", "Đồng hồ GPS thể thao với thời lượng pin dài và báo cáo sức khỏe.", "10990000", 14,
                        image("photo-1579586337278-3befd40fd17a"), image("photo-1522312346375-d1a52e2b99b3"),
                        "Smartwatches", false, "Garmin", 12, "Đen", "Trắng"),

                product("Logitech MX Master 3S", "Chuột không dây yên tĩnh, chính xác cho công việc sáng tạo.", "2490000", 35,
                        image("photo-1527814050087-3793815479db"), image("photo-1615663245857-ac93bb7c39e7"),
                        "Accessories", true, "Logitech", 12, "Đen", "Xám"),
                product("Keychron K2", "Bàn phím cơ không dây nhỏ gọn, hỗ trợ Windows và macOS.", "2190000", 32,
                        image("photo-1587829741301-dc798b83add3"), image("photo-1595225476474-87563907a212"),
                        "Accessories", false, "Keychron", 12, "Đen", "Xám"),
                product("Anker 737 Power Bank", "Pin dự phòng công suất cao cho điện thoại, tablet và laptop.", "3290000", 26,
                        image("photo-1609091839311-d5365f9ff1c5"), image("photo-1583863788434-e58a36330cf0"),
                        "Accessories", false, "Anker", 18, "Đen"),

                product("PlayStation 5 Slim", "Máy chơi game thế hệ mới với SSD tốc độ cao và tay cầm DualSense.", "12990000", 11,
                        image("photo-1606813907291-d86efa9b94db"), image("photo-1606144042614-b2417e99c4e3"),
                        "Gaming", true, "Sony", 12, "Trắng"),
                product("Nintendo Switch OLED", "Máy chơi game linh hoạt với màn hình OLED sống động.", "8490000", 17,
                        image("photo-1578303512597-81e6cc155b3e"), image("photo-1575361204480-aadea25e6e68"),
                        "Gaming", false, "Nintendo", 12, "Trắng", "Đỏ xanh"),
                product("Xbox Wireless Controller", "Tay cầm không dây công thái học cho Xbox và máy tính.", "1590000", 38,
                        image("photo-1606144042614-b2417e99c4e3"), image("photo-1592840496694-26d035b52b48"),
                        "Gaming", false, "Microsoft", 12, "Đen", "Trắng", "Xanh")
        );
    }

    private ProductSeed product(String name,
                                String description,
                                String price,
                                int stockQuantity,
                                String imageUrl,
                                String galleryImage,
                                String category,
                                boolean featured,
                                String brand,
                                int warrantyMonths,
                                String... colors) {
        return new ProductSeed(name, description, price, stockQuantity, imageUrl, List.of(galleryImage), category,
                featured, brand, warrantyMonths, List.of(colors));
    }

    private String image(String photoId) {
        return "https://images.unsplash.com/" + photoId + IMAGE_PARAMS;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private record CategorySeed(String name, String description, boolean featured) {
    }

    private record ProductSeed(String name,
                               String description,
                               String price,
                               int stockQuantity,
                               String imageUrl,
                               List<String> galleryImages,
                               String category,
                               boolean featured,
                               String brand,
                               int warrantyMonths,
                               List<String> colors) {
    }
}
