package com.example.anjanirestaurant.data

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

object RestaurantService {
    private val _activeOrder = MutableStateFlow<Order?>(null)
    val activeOrder: StateFlow<Order?> = _activeOrder.asStateFlow()

    private val serviceScope = CoroutineScope(Dispatchers.Default)

    fun placeOrder(items: List<OrderItem>, address: String, phone: String, total: Double) {
        val newOrder = Order(
            id = "ORD-${(System.currentTimeMillis() % 100000)}",
            items = items,
            totalAmount = total,
            customerAddress = address,
            customerPhone = phone,
            status = OrderStatus.PLACED
        )
        _activeOrder.value = newOrder
        simulateOrderCycle()
    }

    private fun simulateOrderCycle() {
        serviceScope.launch {
            // Step 1: PLACED
            delay(5000)
            _activeOrder.value = _activeOrder.value?.copy(status = OrderStatus.PREPARING)

            // Step 2: PREPARING
            delay(6000)
            _activeOrder.value = _activeOrder.value?.copy(status = OrderStatus.OUT_FOR_DELIVERY)

            // Step 3: OUT FOR DELIVERY - Animate Rider path in 15 steps
            val currentOrder = _activeOrder.value ?: return@launch
            val startLat = currentOrder.restaurantLat
            val startLng = currentOrder.restaurantLng
            val endLat = currentOrder.userLat
            val endLng = currentOrder.userLng
            
            val steps = 15
            for (i in 1..steps) {
                delay(2000)
                val fraction = i.toDouble() / steps
                val currentLat = startLat + fraction * (endLat - startLat)
                val currentLng = startLng + fraction * (endLng - startLng)
                _activeOrder.value = _activeOrder.value?.copy(
                    riderLat = currentLat,
                    riderLng = currentLng
                )
            }

            // Step 4: DELIVERED
            _activeOrder.value = _activeOrder.value?.copy(status = OrderStatus.DELIVERED)
        }
    }

    fun clearActiveOrder() {
        _activeOrder.value = null
    }
}
