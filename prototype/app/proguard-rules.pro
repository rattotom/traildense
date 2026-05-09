# MapLibre
-keep class org.maplibre.android.** { *; }
-keep interface org.maplibre.android.** { *; }

# Retrofit / Gson
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }
-keep class com.google.gson.** { *; }
