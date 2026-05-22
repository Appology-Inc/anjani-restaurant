package com.example.anjanirestaurant.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.anjanirestaurant.data.Order
import com.example.anjanirestaurant.data.OrderStatus
import com.example.anjanirestaurant.data.RestaurantService
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrackingScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val activeOrderState by RestaurantService.activeOrder.collectAsState()
    var showItemsList by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Track Order", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        }
    ) { paddingValues ->
        val order = activeOrderState
        if (order == null) {
            Box(
                modifier = modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("No active order to track.", style = MaterialTheme.typography.bodyLarge)
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = onNavigateBack) {
                        Text("Back to Menu")
                    }
                }
            }
        } else {
            Column(
                modifier = modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // Tracking map area (occupies top 60%)
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1.2f)
                ) {
                    // Try launching GoogleMap.
                    // To handle cases where Play Services are not configured (common on emulator/Docker setups),
                    // we show a gorgeous canvas-based delivery route animation as a premium fallback overlay.
                    GoogleMapTrackingView(order = order)

                    CanvasFallbackView(order = order)
                }

                // Order Status Progression and Rider Details Sheet (occupies bottom 40%)
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(0.8f),
                    shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 24.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp)
                    ) {
                        // Rider Card
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                                    RoundedCornerShape(16.dp)
                                )
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .background(MaterialTheme.colorScheme.primary, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.AccountBox, contentDescription = null, tint = Color.White)
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Rider: Suresh Kumar", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Text(
                                    text = when (order.status) {
                                        OrderStatus.PLACED -> "Order received by restaurant"
                                        OrderStatus.PREPARING -> "Chef is preparing your fresh meal"
                                        OrderStatus.OUT_FOR_DELIVERY -> "Rider is heading your way!"
                                        OrderStatus.DELIVERED -> "Order successfully delivered!"
                                    },
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                )
                            }
                            if (order.status == OrderStatus.OUT_FOR_DELIVERY) {
                                Box(
                                    modifier = Modifier
                                        .background(Color(0xFFE8F5E9), RoundedCornerShape(8.dp))
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text("ETA 12 Min", color = Color(0xFF2E7D32), fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Status Progression Stepper
                        OrderStatusStepper(status = order.status)

                        Spacer(modifier = Modifier.height(16.dp))

                        // Order Detail Summary Toggle
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { showItemsList = !showItemsList }
                                .padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Order items (${order.items.sumOf { it.quantity }})",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Icon(
                                if (showItemsList) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                contentDescription = null
                            )
                        }

                        if (showItemsList) {
                            LazyColumn(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f)
                                    .padding(top = 8.dp)
                            ) {
                                items(order.items) { orderItem ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 4.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            text = "${orderItem.item.name} x ${orderItem.quantity}",
                                            fontSize = 13.sp,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                                        )
                                        Text(
                                            text = "₹${(orderItem.item.price * orderItem.quantity).toInt()}",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        } else {
                            Spacer(modifier = Modifier.weight(1f))
                        }

                        // Bottom Actions
                        if (order.status == OrderStatus.DELIVERED) {
                            Button(
                                onClick = {
                                    RestaurantService.clearActiveOrder()
                                    onNavigateBack()
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Delivered! Back to Menu", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun GoogleMapTrackingView(order: Order) {
    val restaurantLatLng = LatLng(order.restaurantLat, order.restaurantLng)
    val userLatLng = LatLng(order.userLat, order.userLng)
    val riderLatLng = LatLng(order.riderLat, order.riderLng)

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(riderLatLng, 13.5f)
    }

    // Keep camera centered on rider as it moves
    LaunchedEffect(order.riderLat, order.riderLng) {
        cameraPositionState.position = CameraPosition.fromLatLngZoom(riderLatLng, 13.5f)
    }

    GoogleMap(
        modifier = Modifier.fillMaxSize(),
        cameraPositionState = cameraPositionState,
        properties = MapProperties(isMyLocationEnabled = false)
    ) {
        // Restaurant Location Marker
        Marker(
            state = MarkerState(position = restaurantLatLng),
            title = "Anjani Restaurant",
            snippet = "Food Prep Origin"
        )

        // Customer Delivery Location Marker
        Marker(
            state = MarkerState(position = userLatLng),
            title = "Delivery Location",
            snippet = order.customerAddress
        )

        // Delivery Rider Location Marker
        if (order.status == OrderStatus.OUT_FOR_DELIVERY) {
            Marker(
                state = MarkerState(position = riderLatLng),
                title = "Delivery Rider",
                snippet = "Out for Delivery"
            )
        }
    }
}

@Composable
fun CanvasFallbackView(order: Order) {
    // Beautiful interactive Canvas overlay that acts as a visual route simulation
    // This looks premium, displaying the delivery progress vector graph.
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFEEEEEE).copy(alpha = 0.9f))
            .padding(24.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "Live Delivery Route Tracking",
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                color = Color.DarkGray,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Animated Canvas Path
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .background(Color.White, RoundedCornerShape(16.dp))
                    .border(1.dp, Color.LightGray, RoundedCornerShape(16.dp))
                    .padding(24.dp)
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val width = size.width
                    val height = size.height

                    // coordinates for restaurant (left) & user (right)
                    val restOffset = Offset(width * 0.15f, height * 0.5f)
                    val userOffset = Offset(width * 0.85f, height * 0.5f)

                    // Draw route path (curved bezier or dashed line)
                    drawPath(
                        path = androidx.compose.ui.graphics.Path().apply {
                            moveTo(restOffset.x, restOffset.y)
                            quadraticTo(
                                width * 0.5f,
                                height * 0.2f,
                                userOffset.x,
                                userOffset.y
                            )
                        },
                        color = Color.LightGray,
                        style = Stroke(
                            width = 6f,
                            pathEffect = PathEffect.dashPathEffect(floatArrayOf(15f, 15f), 0f)
                        )
                    )

                    // Draw Restaurant node
                    drawCircle(
                        color = FoodPrimary,
                        radius = 20f,
                        center = restOffset
                    )

                    // Draw User node
                    drawCircle(
                        color = Color(0xFF2196F3),
                        radius = 20f,
                        center = userOffset
                    )

                    // Calculate Rider current animated offset
                    if (order.status == OrderStatus.OUT_FOR_DELIVERY) {
                        // Estimate fraction of journey completed based on riderLat vs restaurantLat/userLat
                        val latTotalDiff = order.userLat - order.restaurantLat
                        val latProgress = order.riderLat - order.restaurantLat
                        val fraction = if (latTotalDiff != 0.0) (latProgress / latTotalDiff).coerceIn(0.0, 1.0) else 0.0

                        // Quadratic Bezier interpolation for the canvas path
                        val riderX = restOffset.x + fraction.toFloat() * (userOffset.x - restOffset.x)
                        val t = fraction.toFloat()
                        // y(t) = (1-t)^2 * P0_y + 2(1-t)t * P1_y + t^2 * P2_y
                        val riderY = (1 - t) * (1 - t) * restOffset.y + 2 * (1 - t) * t * (height * 0.2f) + t * t * userOffset.y

                        drawCircle(
                            color = Color(0xFF4CAF50),
                            radius = 16f,
                            center = Offset(riderX, riderY)
                        )
                    }
                }

                // Overlay Text Labels
                Box(modifier = Modifier.fillMaxSize()) {
                    Text(
                        "Anjani Restaurant",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = FoodPrimary,
                        modifier = Modifier.align(Alignment.BottomStart)
                    )

                    Text(
                        "My Home",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF2196F3),
                        modifier = Modifier.align(Alignment.BottomEnd)
                    )

                    if (order.status == OrderStatus.OUT_FOR_DELIVERY) {
                        Text(
                            "Delivery Rider (Moving...)",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF2E7D32),
                            modifier = Modifier.align(Alignment.TopCenter)
                        )
                    } else {
                        Text(
                            text = when (order.status) {
                                OrderStatus.PLACED -> "Waiting for restaurant approval..."
                                OrderStatus.PREPARING -> "Kitchen preparing order..."
                                OrderStatus.DELIVERED -> "Delivered!"
                                else -> ""
                            },
                            fontSize = 11.sp,
                            color = Color.Gray,
                            modifier = Modifier.align(Alignment.TopCenter)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun OrderStatusStepper(status: OrderStatus) {
    val steps = listOf(
        OrderStatus.PLACED to "Placed",
        OrderStatus.PREPARING to "Kitchen",
        OrderStatus.OUT_FOR_DELIVERY to "On the Way",
        OrderStatus.DELIVERED to "Delivered"
    )

    val currentStepIndex = steps.indexOfFirst { it.first == status }.coerceAtLeast(0)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        steps.forEachIndexed { index, pair ->
            val isActive = index <= currentStepIndex
            val isCurrent = index == currentStepIndex

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .background(
                            if (isActive) MaterialTheme.colorScheme.primary else Color.LightGray.copy(alpha = 0.5f),
                            CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = when (pair.first) {
                            OrderStatus.PLACED -> Icons.Default.CheckCircle
                            OrderStatus.PREPARING -> Icons.Default.Menu
                            OrderStatus.OUT_FOR_DELIVERY -> Icons.Default.Send
                            OrderStatus.DELIVERED -> Icons.Default.Check
                        },
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = if (isActive) Color.White else Color.Gray
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = pair.second,
                    fontSize = 11.sp,
                    fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                    color = if (isActive) MaterialTheme.colorScheme.primary else Color.Gray
                )
            }

            if (index < steps.size - 1) {
                // Line connector
                Box(
                    modifier = Modifier
                        .height(2.dp)
                        .weight(0.5f)
                        .background(if (index < currentStepIndex) MaterialTheme.colorScheme.primary else Color.LightGray.copy(alpha = 0.5f))
                )
            }
        }
    }
}
