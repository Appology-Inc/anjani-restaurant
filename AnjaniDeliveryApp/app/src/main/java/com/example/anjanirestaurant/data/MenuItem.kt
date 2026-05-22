package com.example.anjanirestaurant.data

import kotlinx.serialization.Serializable

@Serializable
data class MenuItem(
    val id: String,
    val name: String,
    val category: String,
    val description: String,
    val price: Double,
    val imageUrl: String,
    val isVeg: Boolean,
    val rating: Double = 4.5
)
