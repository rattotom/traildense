package com.traildense.app.ui.component

import android.view.Gravity
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.Style

private const val MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty"

@Composable
fun MapLibreView(
    modifier: Modifier = Modifier,
    lat: Double = 0.0,
    lon: Double = 0.0,
    hasLocation: Boolean = false
) {
    var map by remember { mutableStateOf<MapLibreMap?>(null) }
    var firstFix by remember { mutableStateOf(true) }

    AndroidView(
        factory = { ctx ->
            MapView(ctx).apply {
                getMapAsync { m ->
                    map = m
                    m.uiSettings.apply {
                        isLogoEnabled        = false
                        isAttributionEnabled = false
                        compassGravity       = Gravity.TOP or Gravity.END
                    }
                    m.setStyle(Style.Builder().fromUri(MAP_STYLE))
                }
            }
        },
        modifier = modifier,
        update = { _ ->
            if (hasLocation && lat != 0.0 && lon != 0.0) {
                map?.let { m ->
                    val pos = LatLng(lat, lon)
                    if (firstFix) {
                        m.animateCamera(
                            CameraUpdateFactory.newCameraPosition(
                                CameraPosition.Builder().target(pos).zoom(15.0).build()
                            )
                        )
                        firstFix = false
                    } else {
                        m.animateCamera(CameraUpdateFactory.newLatLng(pos), 800)
                    }
                }
            }
        }
    )
}
