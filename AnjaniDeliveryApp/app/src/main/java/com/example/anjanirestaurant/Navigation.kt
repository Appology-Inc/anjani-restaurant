package com.example.anjanirestaurant

import androidx.compose.runtime.Composable
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.example.anjanirestaurant.ui.screens.CartScreen
import com.example.anjanirestaurant.ui.screens.LoginScreen
import com.example.anjanirestaurant.ui.screens.MenuScreen
import com.example.anjanirestaurant.ui.screens.ProfileScreen
import com.example.anjanirestaurant.ui.screens.TrackingScreen

@Composable
fun MainNavigation() {
  val backStack = rememberNavBackStack(Login)

  NavDisplay(
    backStack = backStack,
    onBack = { backStack.removeLastOrNull() },
    entryProvider =
      entryProvider {
        entry<Login> {
          LoginScreen(
            onLoginSuccess = {
              backStack.add(Menu)
            }
          )
        }
        entry<Menu> {
          MenuScreen(
            onNavigateToCart = { backStack.add(Cart) },
            onNavigateToProfile = { backStack.add(Profile) }
          )
        }
        entry<Cart> {
          CartScreen(
            onNavigateBack = { backStack.removeLastOrNull() },
            onOrderPlaced = { backStack.add(Tracking) }
          )
        }
        entry<Tracking> {
          TrackingScreen(
            onNavigateBack = { backStack.removeLastOrNull() }
          )
        }
        entry<Profile> {
          ProfileScreen(
            onNavigateBack = { backStack.removeLastOrNull() },
            onLogout = {
              backStack.removeLastOrNull() // pop Profile
              backStack.removeLastOrNull() // pop Menu
              backStack.add(Login)
            }
          )
        }
      },
  )
}

