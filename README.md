# AlienAnimalCatcher

Flieg mit einem rosa UFO durch fünf Nachtparcours, rette Tiere mit deinem Fangstrahl und stelle dich danach dem Sternenjäger und der Weltraumkuh. In der Levelauswahl sind alle sieben Missionen direkt spielbar.

## Im Browser spielen

Öffne `index.html` in einem aktuellen Browser. Das Spiel läuft auch offline.

| Aktion | Tastatur | Xbox-Controller |
| --- | --- | --- |
| Fliegen | WASD oder Pfeiltasten | Linker Stick oder Steuerkreuz |
| Tiere beamen | Leertaste | A oder RT |
| Im Bosskampf schießen | F | X oder RB |
| Pause | Esc | Menü-Taste |
| Levelauswahl öffnen | Levelauswahl-Knopf | Y |
| Vollbild umschalten | V | View |

## Android

Unter [Actions → Android APK](https://github.com/dominikamon-kirbio/AlienAnimalCatcher/actions/workflows/android.yml) den letzten erfolgreichen Lauf öffnen und das Artefakt **AlienAnimalCatcher-Android** herunterladen. Das ZIP entpacken und `AlienAnimalCatcher.apk` auf einem Gerät mit Android 8.0 oder neuer installieren. Es handelt sich um eine Debug-APK zur Direktinstallation.

Die App läuft offline im Querformat. Links steuerst du das UFO mit dem Touch-Joystick, rechts hältst du **Beamen** oder im Bosskampf **Schießen**. Ein gekoppelter Xbox-Controller kann ebenfalls verwendet werden.

### Lokal bauen

Den Ordner `android` in Android Studio öffnen oder mit JDK 17, Android SDK 35 und Build Tools 34.0.0 aus dem Ordner `android` bauen.

```sh
./gradlew :app:assembleDebug :app:lintDebug
```

Unter Windows lautet der Befehl `.\gradlew.bat :app:assembleDebug :app:lintDebug`. Die APK liegt anschließend unter `android/app/build/outputs/apk/debug/app-debug.apk`. Der Android-Build übernimmt die drei Spieldateien aus dem Projektstamm.
