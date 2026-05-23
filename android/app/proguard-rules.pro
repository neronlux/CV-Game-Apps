-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

-keep class com.getcapacitor.** { *; }
-keep class com.career.rocketride.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.CapacitorPlugin <methods>;
}
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
