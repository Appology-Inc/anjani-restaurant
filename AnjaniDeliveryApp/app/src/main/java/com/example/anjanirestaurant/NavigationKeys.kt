package com.example.anjanirestaurant

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

@Serializable data object Login : NavKey
@Serializable data object Menu : NavKey
@Serializable data object Cart : NavKey
@Serializable data object Tracking : NavKey
@Serializable data object Profile : NavKey

