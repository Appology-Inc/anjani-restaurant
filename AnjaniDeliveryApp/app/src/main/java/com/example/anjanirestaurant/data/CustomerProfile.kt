package com.example.anjanirestaurant.data

import kotlinx.serialization.Serializable

@Serializable
data class CustomerProfile(
    val uid: String = "",
    val name: String = "",
    val phone: String = "",
    val email: String = "",
    val address: String = ""
)
