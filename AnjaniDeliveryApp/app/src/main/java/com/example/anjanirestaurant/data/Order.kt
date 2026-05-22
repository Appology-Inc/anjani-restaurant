package com.example.anjanirestaurant.data

import kotlinx.serialization.Serializable

@Serializable
enum class OrderStatus {
    PLACED,
    PREPARING,
    OUT_FOR_DELIVERY,
    DELIVERED
}

@Serializable
data class OrderItem(
    val item: MenuItem,
    val quantity: Int
)

@Serializable
data class Order(
    val id: String = "",
    val items: List<OrderItem> = emptyList(),
    val totalAmount: Double = 0.0,
    val customerAddress: String = "",
    val customerPhone: String = "",
    val status: OrderStatus = OrderStatus.PLACED,
    val riderLat: Double = 17.4350,
    val riderLng: Double = 78.4482,
    val restaurantLat: Double = 17.4350, // Anjani Restaurant Mock Coordinates (Gachibowli, Hyderabad, for instance)
    val restaurantLng: Double = 78.4482,
    val userLat: Double = 17.4485,       // Customer Delivery Mock Location
    val userLng: Double = 78.4740,
    val timestamp: Long = System.currentTimeMillis()
)
