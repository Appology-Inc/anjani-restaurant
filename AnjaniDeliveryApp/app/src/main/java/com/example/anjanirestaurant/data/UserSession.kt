package com.example.anjanirestaurant.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object UserSession {
    private val _currentUser = MutableStateFlow<CustomerProfile?>(null)
    val currentUser: StateFlow<CustomerProfile?> = _currentUser.asStateFlow()

    fun login(profile: CustomerProfile) {
        _currentUser.value = profile
    }

    fun logout() {
        _currentUser.value = null
    }

    fun updateAddress(newAddress: String) {
        _currentUser.value = _currentUser.value?.copy(address = newAddress)
    }
}
