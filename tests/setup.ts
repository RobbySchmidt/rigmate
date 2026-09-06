// "import 'dotenv/config'" laedt dotenv 17 mit seinen Standardeinstellungen,
// und die geben beim Laden eine zufaellige Werbezeile auf stdout aus (siehe
// _getRandomTip in node_modules/dotenv/lib/main.js) - das macht die Ausgabe
// von Testlaeufen unzuverlaessig, wenn irgendwas daraus maschinell gelesen
// wird. `quiet: true` unterdrueckt genau diese Ausgabe.
import { config as loadEnv } from 'dotenv'
loadEnv({ quiet: true })
