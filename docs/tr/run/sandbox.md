# Sandbox

Öngörülen kullanım senaryomuzda, SubQuery düğümü genellikle güvenilir bir ana makine tarafından çalıştırılır ve kullanıcı tarafından düğüme gönderilen SubQuery projesinin kodu tamamen güvenilir değildir.

Bazı kötü amaçlı kodların ana makineye saldırması, hatta güvenliğini tehlikeye atması ve aynı ana makinedeki diğer projelerin verilerine zarar vermesi muhtemeldir. Bu nedenle, riskleri azaltmak için [VM2](https://www.npmjs.com/package/vm2) korumalı sandbox mekanizmasını kullanıyoruz. Bu:

- Güvenilmeyen kodu izole bir bağlamda güvenli bir şekilde çalıştırır ve kötü amaçlı kodlar, sandbox'a enjekte ettiğimiz korunmasız arayüz aracılığıyla olmadığı sürece ana bilgisayarın ağına veya dosya sistemine erişemez.

- Korumalı alanlar arasında metotları güvenli bir şekilde çağırır, veri ve geri çağrı alışverişi yapar.

- Bilinen birçok saldırı yöntemine karşı bağışıktır.


## Kısıtlama

- Belirli yerleşik modüllere erişimi sınırlamak için, yalnızca `assert`, `buffer`, `crypto`,`util` ve `path` beyaz listededir.

- **CommonJS** ile yazılmış [3rd party modules](../create/mapping.md#third-party-libraries) ve ESM'yi varsayılan olarak kullanan `@polkadot/*` gibi **hybrid** kitaplıkları destekliyoruz.

- `HTTP` ve `WebSocket` kullanan tüm modüller yasaktır.
