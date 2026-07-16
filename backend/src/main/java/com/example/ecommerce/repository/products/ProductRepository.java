package com.example.ecommerce.repository.products;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.ecommerce.entity.product.Product;

import java.math.BigDecimal;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Page<Product> findByActiveTrue(Pageable pageable);

    Page<Product> findByCategoryIdAndActiveTrue(Long categoryId, Pageable pageable);

    Page<Product> findByNameContainingIgnoreCaseAndActiveTrue(String name, Pageable pageable);

    Page<Product> findByActiveTrueAndFeaturedTrue(Pageable pageable);

    Page<Product> findByActiveTrueAndStockQuantityLessThanOrderByStockQuantityAsc(int threshold, Pageable pageable);

    @Query("""
            select p from Product p
            where p.active = true
              and (:keyword is null or lower(p.name) like lower(concat('%', :keyword, '%')))
              and (:categoryId is null or p.category.id = :categoryId)
              and (:minPrice is null or p.price >= :minPrice)
              and (:maxPrice is null or p.price <= :maxPrice)
            """)
    Page<Product> searchActiveProducts(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            Pageable pageable);

    @Query(value = """
            select p from Product p
            where p.active = true
              and (:keyword is null or lower(p.name) like lower(concat('%', :keyword, '%')))
              and (:categoryId is null or p.category.id = :categoryId)
              and (:minPrice is null or p.price >= :minPrice)
              and (:maxPrice is null or p.price <= :maxPrice)
              and (:minRating is null or (
                  select coalesce(avg(r.rating), 0)
                  from ProductReview r
                  where r.product = p
                    and r.hidden = false
              ) >= :minRating)
            """, countQuery = """
            select count(distinct p) from Product p
            where p.active = true
              and (:keyword is null or lower(p.name) like lower(concat('%', :keyword, '%')))
              and (:categoryId is null or p.category.id = :categoryId)
              and (:minPrice is null or p.price >= :minPrice)
              and (:maxPrice is null or p.price <= :maxPrice)
              and (:minRating is null or (
                  select coalesce(avg(r2.rating), 0)
                  from ProductReview r2
                  where r2.product = p
                    and r2.hidden = false
              ) >= :minRating)
            """)
    Page<Product> searchActiveProductsWithRating(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("minRating") Double minRating,
            Pageable pageable);

    @Query(value = """
            select p from Product p
            where p.active = true
              and (:keyword is null or lower(p.name) like lower(concat('%', :keyword, '%')))
              and (:categoryId is null or p.category.id = :categoryId)
              and (:minPrice is null or p.price >= :minPrice)
              and (:maxPrice is null or p.price <= :maxPrice)
              and (:minRating is null or (
                  select coalesce(avg(r.rating), 0)
                  from ProductReview r
                  where r.product = p
                    and r.hidden = false
              ) >= :minRating)
            order by (
                select coalesce(avg(r3.rating), 0)
                from ProductReview r3
                where r3.product = p
                    and r3.hidden = false
            ) desc, p.createdAt desc
            """, countQuery = """
            select count(distinct p) from Product p
            where p.active = true
              and (:keyword is null or lower(p.name) like lower(concat('%', :keyword, '%')))
              and (:categoryId is null or p.category.id = :categoryId)
              and (:minPrice is null or p.price >= :minPrice)
              and (:maxPrice is null or p.price <= :maxPrice)
              and (:minRating is null or (
                  select coalesce(avg(r2.rating), 0)
                  from ProductReview r2
                  where r2.product = p
                    and r2.hidden = false
              ) >= :minRating)
            """)
    Page<Product> searchActiveProductsOrderByRating(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("minRating") Double minRating,
            Pageable pageable);

    @Query(value = """
            select p from Product p
            where p.active = true
              and (:keyword is null or lower(p.name) like lower(concat('%', :keyword, '%')))
              and (:categoryId is null or p.category.id = :categoryId)
              and (:minPrice is null or p.price >= :minPrice)
              and (:maxPrice is null or p.price <= :maxPrice)
              and (:minRating is null or (
                  select coalesce(avg(r.rating), 0)
                  from ProductReview r
                  where r.product = p
                    and r.hidden = false
              ) >= :minRating)
            order by (
                select coalesce(sum(oi.quantity), 0)
                from OrderItem oi
                where oi.product = p
            ) desc, p.createdAt desc
            """, countQuery = """
            select count(distinct p) from Product p
            where p.active = true
              and (:keyword is null or lower(p.name) like lower(concat('%', :keyword, '%')))
              and (:categoryId is null or p.category.id = :categoryId)
              and (:minPrice is null or p.price >= :minPrice)
              and (:maxPrice is null or p.price <= :maxPrice)
              and (:minRating is null or (
                  select coalesce(avg(r2.rating), 0)
                  from ProductReview r2
                  where r2.product = p
                    and r2.hidden = false
              ) >= :minRating)
            """)
    Page<Product> searchActiveProductsOrderBySold(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("minRating") Double minRating,
            Pageable pageable);
}
