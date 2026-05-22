package com.example.anjanirestaurant.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

object CartManager {
    private val _cartItems = MutableStateFlow<Map<String, OrderItem>>(emptyMap())
    val cartItems: StateFlow<Map<String, OrderItem>> = _cartItems.asStateFlow()

    fun addItem(item: MenuItem) {
        _cartItems.update { current ->
            val existing = current[item.id]
            val newQty = (existing?.quantity ?: 0) + 1
            current + (item.id to OrderItem(item, newQty))
        }
    }

    fun removeItem(item: MenuItem) {
        _cartItems.update { current ->
            val existing = current[item.id] ?: return@update current
            if (existing.quantity <= 1) {
                current - item.id
            } else {
                current + (item.id to OrderItem(item, existing.quantity - 1))
            }
        }
    }

    fun clear() {
        _cartItems.value = emptyMap()
    }

    fun getTotalPrice(): Double {
        return _cartItems.value.values.sumOf { it.item.price * it.quantity }
    }

    fun getItemCount(): Int {
        return _cartItems.value.values.sumOf { it.quantity }
    }
}
