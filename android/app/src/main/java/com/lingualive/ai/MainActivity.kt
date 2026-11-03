package com.lingualive.ai

import android.Manifest
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.lingualive.ai.ui.screens.*
import com.lingualive.ai.ui.theme.BackgroundDark
import com.lingualive.ai.ui.theme.LinguaLiveTheme
import com.lingualive.ai.ui.theme.PrimaryIndigo
import com.lingualive.ai.ui.theme.SurfaceDark

class MainActivity : ComponentActivity() {

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        // Permissions handled
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        com.lingualive.ai.ml.TranslationRepository.initTts(this)

        // Request Audio and Camera permissions on launch
        permissionLauncher.launch(
            arrayOf(
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.CAMERA
            )
        )

        setContent {
            LinguaLiveTheme {
                MainApp()
            }
        }
    }
}

@Composable
fun MainApp() {
    var selectedTab by remember { mutableStateOf(0) }

    val navItems = listOf(
        Pair("Call", Icons.Default.Phone),
        Pair("Split", Icons.Default.People),
        Pair("Translate", Icons.Default.Translate),
        Pair("OCR", Icons.Default.CameraAlt),
        Pair("Offline", Icons.Default.Download)
    )

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = BackgroundDark,
        bottomBar = {
            NavigationBar(containerColor = SurfaceDark) {
                navItems.forEachIndexed { index, (title, icon) ->
                    NavigationBarItem(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        icon = { Icon(icon, contentDescription = title) },
                        label = { Text(title) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = PrimaryIndigo,
                            selectedTextColor = PrimaryIndigo,
                            indicatorColor = PrimaryIndigo.copy(alpha = 0.15f)
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            color = BackgroundDark
        ) {
            when (selectedTab) {
                0 -> CallScreen()
                1 -> FaceToFaceScreen()
                2 -> QuickTranslateScreen()
                3 -> CameraOcrScreen()
                4 -> OfflineManagerScreen()
            }
        }
    }
}
