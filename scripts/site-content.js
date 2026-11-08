'use strict';
// Hand-written Turkish content for the static site (about pages, category intros,
// guides and recipe tips). Rendered by scripts/build-recipe-pages.js.

const p = (...paragraphs) => paragraphs.map(text => `<p>${text}</p>`).join('\n');

const INFO_PAGES = [
    {
        slug: 'hakkimizda', title: 'Hakkımızda',
        description: 'Bar Cepte nedir, kimler için yapıldı ve tarifler nasıl hazırlanıyor?',
        html: p(
            'Bar Cepte, evde kokteyl hazırlamak isteyenler için yapılmış ücretsiz bir Türkçe tarif ve ev barı uygulamasıdır. Elindeki şişeleri ve mutfak malzemelerini seçtiğinde, bunlarla hemen hazırlayabileceğin tarifleri ve bir ya da iki malzeme eksik olan tarifleri ayrı ayrı gösterir.',
            'Sitedeki 440’tan fazla tarif, dünyada yaygın olarak bilinen klasik ve modern kokteyllerden oluşur. Malzeme adlarını, ölçüleri (oz yerine cl) ve bardak adlarını Türkçeye uyarlıyoruz; yapılış adımlarını da Türkçe olarak sunuyoruz. Tariflerin yanında evde bar kurmak, ekipman seçmek ve temel teknikler hakkında <a href="/rehber/">rehber yazıları</a> da yayınlıyoruz.',
            'Uygulama içinde kişisel barını kaydedebilir, favori tariflerini işaretleyebilir, porsiyonu çoğaltabilir, alışveriş listesi oluşturabilir ve kendi tariflerini ekleyebilirsin. AI Barmen özelliği, elindeki malzemelere göre öneri yapar; bu öneriler otomatik üretildiği için servis etmeden önce ölçüleri kontrol etmeni öneririz.',
            'Bar Cepte hiçbir şekilde alkollü içki satmaz. İçerikler yalnızca 18 yaş ve üzeri yetişkinler içindir; alkolü ölçülü ve sorumlu tüketmeni, alkol aldıysan araç kullanmamanı rica ederiz. Alkolsüz seçenekler için <a href="/tarif/kategori/alkolsuz.html">alkolsüz tarifler</a> sayfasına bakabilirsin.',
            'Proje bağımsız olarak geliştiriliyor. Görüş, öneri ve hata bildirimleri için <a href="mailto:barcepte@gmail.com">barcepte@gmail.com</a> adresine yazabilir ya da <a href="/iletisim.html">iletişim sayfasını</a> kullanabilirsin.'
        )
    },
    {
        slug: 'iletisim', title: 'İletişim',
        description: 'Bar Cepte ile iletişime geç: öneri, hata bildirimi ve telif talepleri.',
        html: p(
            'Bar Cepte hakkında soru, öneri, hata bildirimi veya telif hakkı talebin varsa bize e-posta ile ulaşabilirsin. Mesajlar düzenli olarak okunur ve yanıtlanır.',
            '<strong>E-posta:</strong> <a href="mailto:barcepte@gmail.com">barcepte@gmail.com</a>',
            'Hata bildirimleri için GitHub üzerinden kayıt (issue) da açabilirsin: <a href="https://github.com/suluncaway/bar-cepte/issues" rel="noopener">github.com/suluncaway/bar-cepte/issues</a>',
            'Abonelik (Reserve) ve ödeme konularında, satın alma sırasında Shopier’den gelen sipariş bilgilerini mesajına eklersen daha hızlı yardımcı olabiliriz. Lütfen mesajlarında şifre, kart bilgisi gibi hassas bilgiler paylaşma.',
            'Kişisel verilerin nasıl işlendiğini <a href="/privacy.html">Gizlilik Politikası</a> sayfasında, kullanım şartlarını <a href="/kullanim-kosullari.html">Kullanım Koşulları</a> sayfasında bulabilirsin.'
        )
    },
    {
        slug: 'kullanim-kosullari', title: 'Kullanım Koşulları',
        description: 'Bar Cepte web sitesi ve uygulamasının kullanım koşulları.',
        html: p(
            '<strong>Yaş sınırı.</strong> Bar Cepte’deki alkollü içecek tarifleri ve ilgili içerikler yalnızca 18 yaş ve üzeri kişiler içindir. 18 yaşından küçüksen alkollü tarifleri kullanmamalısın; alkolsüz tarifler herkese açıktır.',
            '<strong>Satış yapılmaz.</strong> Bar Cepte bir tarif ve bilgi hizmetidir; alkollü içki satışı, aracılığı veya teslimatı yapmaz. Sitede gösterilen reklamlar ve öneriler üçüncü taraflara aittir.',
            '<strong>Sorumlu tüketim.</strong> Tarifler bilgilendirme amaçlıdır. Alkolü ölçülü tüketmek, alkol aldıktan sonra araç kullanmamak, hamilelik ve ilaç kullanımı gibi durumlarda alkolden kaçınmak kullanıcının sorumluluğundadır.',
            '<strong>İçeriğin doğruluğu.</strong> Tarifleri, ölçüleri ve çevirileri özenle hazırlıyoruz; yine de hata olabilir. Alerjen içeren malzemeleri (yumurta, süt, kuruyemiş vb.) servis etmeden önce kontrol et. AI Barmen’in ürettiği öneriler otomatiktir ve doğrulanmadan uygulanmamalıdır.',
            '<strong>Hesap ve veriler.</strong> Uygulamadaki barın, favorilerin ve notların cihazında saklanır; bulut yedeklemeyi açarsan Google hesabına bağlı olarak yedeklenir. Ayrıntılar <a href="/privacy.html">Gizlilik Politikası</a>’ndadır.',
            '<strong>Abonelik.</strong> Reserve aboneliği Shopier üzerinden satın alınır; fiyat ve süre satın alma ekranında belirtilir. Cayma ve iade talepleri ilgili mevzuata ve Shopier’in koşullarına tabidir; talepler için <a href="/iletisim.html">iletişim</a> sayfasını kullanabilirsin.',
            '<strong>Değişiklikler.</strong> Bu koşullar zaman zaman güncellenebilir; güncel metin her zaman bu sayfada yayınlanır.'
        )
    }
];

// Categories: `match(drink, text)` gets the drink and its lower-cased ingredient list.
const CATEGORIES = [
    { slug: 'cin', name: 'Cin', title: 'Cin Kokteylleri', match: (d, t) => /\bgin\b/.test(t),
        intro: p('Cin, ardıç meyvesi ve çeşitli bitkilerle aromalandırılmış, berrak bir içkidir. Kendine özgü reçineli ve ferah kokusu sayesinde kokteyllerin en çok kullanılan temel içkilerinden biridir. London Dry tarzı cinler kuru ve keskin, daha modern cinler ise narenciye ya da çiçek notalarıyla daha yumuşak olur.',
            'Cin kokteylleri genellikle üç ana gruba ayrılır: tonik veya soda ile uzatılan ferah içecekler (Cin Tonik, Tom Collins), limon ve şekerle çalkalanan ekşiler (Gimlet, Cin Sour, Bee’s Knees tarzı tarifler) ve vermutla karıştırılan güçlü klasikler (Martini, Negroni). Evde başlamak için bir şişe cin, taze limon, şeker şurubu ve tonik suyu, aşağıdaki tariflerin büyük bölümünü hazırlamaya yeter.') },
    { slug: 'votka', name: 'Votka', title: 'Votka Kokteylleri', match: (d, t) => /vodka/.test(t),
        intro: p('Votka, tadı ve kokusu en nötr olan damıtılmış içkilerden biridir. Bu yüzden içine katılan meyve suyunun, likörün ya da baharatın tadını öne çıkarır ve kokteyl yapmaya yeni başlayanlar için en kolay temeldir.',
            'Votkalı tarifler basit karışımlardan (Screwdriver, Votka Tonik) acılı ve tuzlu klasiklere (Bloody Mary) ve tatlı, kremalı kokteyllere (White Russian) kadar geniş bir yelpazeye yayılır. Moscow Mule gibi zencefilli içecekler de votkanın en sevilen kullanımlarındandır. Votka nötr olduğu için kalitesi en çok sade servis edilen tariflerde, örneğin Votka Martini’de hissedilir.') },
    { slug: 'rom', name: 'Rom', title: 'Rom Kokteylleri', match: (d, t) => /\brum\b|bacardi/.test(t),
        intro: p('Rom, şeker kamışı ya da melastan üretilen bir içkidir. Açık (beyaz) romlar hafif ve temiz bir tada sahiptir; koyu ve yıllanmış romlar ise karamel, vanilya ve baharat notaları taşır. Tropikal kokteyllerin çoğunun temelinde rom vardır.',
            'Mojito ve Daiquiri gibi ferah tarifler genellikle açık romla, Mai Tai ve Dark ’n’ Stormy gibi daha yoğun tarifler ise koyu romla hazırlanır. Piña Colada gibi blender kokteylleri yaz için idealdir. Evde bir şişe açık rom, taze misket limonu, şeker ve nane ile pek çok klasik tarifi hazırlayabilirsin.') },
    { slug: 'tekila', name: 'Tekila', title: 'Tekila Kokteylleri', match: (d, t) => /tequila|mezcal/.test(t),
        intro: p('Tekila, Meksika’da mavi agav bitkisinden üretilir. Blanco (beyaz) tekilalar taze ve bitkisel, reposado ve añejo türleri ise fıçıda dinlendirildiği için daha yumuşak ve odunsu bir tada sahiptir. Mezcal de agavdan yapılır ancak genellikle dumanlı bir karaktere sahiptir.',
            'Tekila kokteyllerinin en bilineni Margarita’dır: tekila, portakal likörü ve misket limonunun dengeli bir buluşmasıdır. Greyfurtlu Paloma ve portakal suyu ile grenadinin katman oluşturduğu Tequila Sunrise de sık hazırlanan tariflerdir. Bardağın kenarına tuz sürmek tekila tariflerinde yaygın bir dokunuştur.') },
    { slug: 'viski', name: 'Viski', title: 'Viski ve Burbon Kokteylleri', match: (d, t) => /whisk|bourbon|scotch|\brye\b/.test(t),
        intro: p('Viski, tahıldan damıtılıp fıçıda dinlendirilen bir içkidir. İskoç viskileri (scotch) çoğunlukla arpa maltından yapılır ve bazıları dumanlıdır; Amerikan burbonu en az %51 mısırdan üretilir ve daha tatlı, vanilyalı bir karaktere sahiptir; çavdar (rye) viskileri ise daha baharatlıdır.',
            'Old Fashioned ve Manhattan gibi viski kokteylleri genellikle buzla karıştırılarak hazırlanır ve viskinin karakterini öne çıkarır. Whiskey Sour gibi ekşiler limon ve şekerle çalkalanır, Irish Coffee gibi sıcak içecekler ise kış akşamları için uygundur. Burbon tatlı, scotch daha sert ve dumanlı sonuç verir; tarifte belirtilen türü kullanmak dengeyi korur.') },
    { slug: 'brendi', name: 'Brendi ve Konyak', title: 'Brendi ve Konyak Kokteylleri', match: (d, t) => /brandy|cognac/.test(t),
        intro: p('Brendi, şarabın ya da meyvenin damıtılmasıyla elde edilen bir içkidir; Fransa’nın Cognac bölgesinde belirli kurallarla üretilen brendiye konyak denir. Fıçıda dinlendirildiği için meyveli, kuru üzümsü ve odunsu notalar taşır.',
            'Sidecar ve Brandy Alexander gibi klasikler brendinin en bilinen kokteylleridir. Elma, kayısı ya da kiraz brendisi gibi meyve brendileri de bazı tariflerde kullanılır. Brendi kokteylleri genellikle yemek sonrası ya da serin havalarda tercih edilir.') },
    { slug: 'sarap-sampanya', name: 'Şarap ve Şampanya', title: 'Şarap ve Şampanya Kokteylleri', match: (d, t) => /\bwine\b|champagne|prosecco|\bport\b|sherry|vermouth/.test(t) && !/\bgin\b|vodka|\brum\b|tequila|whisk|bourbon|brandy|cognac/.test(t),
        intro: p('Şarap, şampanya, vermut ve porto gibi içkilerle hazırlanan kokteyller, damıtılmış içkili tariflere göre genellikle daha hafiftir. Bu yüzden öğle buluşmaları, kutlamalar ve kalabalık sofralar için uygundur.',
            'Mimosa ve Bellini gibi köpüklü kokteyller, Sangria ve sıcak şarap gibi kalabalık için hazırlanan içecekler ve Spritz tarzı aperatifler bu grubun en bilinen örnekleridir. Köpüklü şarap kullanan tariflerde içeceği en son ve yavaşça eklemek, köpüğün kaybolmasını önler.') },
    { slug: 'alkolsuz', name: 'Alkolsüz', title: 'Alkolsüz Kokteyl ve İçecek Tarifleri', match: d => /non/i.test(d.strAlcoholic || ''),
        intro: p('Alkolsüz kokteyller (mocktail), alkol almak istemeyenler, araç kullanacaklar ya da sadece hafif bir şey içmek isteyenler için hazırlanır. İyi bir alkolsüz kokteyl de tıpkı diğerleri gibi tatlılık, ekşilik ve ferahlık dengesine dayanır.',
            'Bu bölümde limonata ve meyve kokteylleri, smoothie ve shake’ler, Hint lassi’si gibi yoğurtlu içecekler ve sıcak kakao ile kahve tarifleri bulabilirsin. Taze meyve suyu, kaliteli soda ve bol buz, alkolsüz içeceklerde farkı yaratan üç temel malzemedir.') }
];

const GUIDES = [
    {
        slug: 'evde-bar-kurmak', title: 'Evde Bar Kurmak: Başlangıç Rehberi',
        description: 'Evde kokteyl yapmaya başlamak için hangi şişeler, malzemeler ve ekipmanlar gerekir? Adım adım başlangıç rehberi.',
        html: `<p>Evde kokteyl hazırlamak için onlarca şişeye ya da pahalı ekipmana ihtiyacın yok. İyi bir ev barı, birkaç doğru seçimle başlar ve zamanla senin damak zevkine göre büyür. Bu rehberde ilk alışverişte nelere öncelik vermen gerektiğini ve bütçeni nasıl verimli kullanabileceğini anlatıyoruz.</p>
<h2>1. Önce ne içmeyi sevdiğine karar ver</h2>
<p>Ev barı kurmanın en sık yapılan hatası, “her şeyden biraz” almaktır. Bunun yerine sevdiğin üç dört kokteyli seç ve o tariflerin ortak malzemelerini al. Örneğin Mojito, Daiquiri ve Cuba Libre seviyorsan bir şişe açık rom, misket limonu, şeker ve kola ile üçünü de hazırlayabilirsin. Bar Cepte’de malzemelerini seçtiğinde hangi tarifleri hemen yapabileceğini ve hangi tek şişenin en çok yeni tarif açacağını görebilirsin.</p>
<h2>2. Temel şişeler</h2>
<p>Klasik kokteyllerin büyük bölümü altı temel içki etrafında döner: cin, votka, rom, tekila, viski (veya burbon) ve brendi. Hepsini aynı anda almak zorunda değilsin; sevdiğin tariflere göre iki üç tanesiyle başlamak yeterlidir. Bunlara ek olarak bir portakal likörü (triple sec), tatlı vermut ve bir acı likör (örneğin Campari) eklemek, Margarita’dan Negroni’ye kadar pek çok klasiği mümkün kılar.</p>
<p>Orta segment bir şişe genellikle en iyi seçimdir: çok ucuz içkiler kokteylin tadını bozabilir, çok pahalı olanların farkı ise karışım içinde kaybolur. Pahalı şişeleri sade içmek ya da Martini ve Old Fashioned gibi içkinin ön planda olduğu tarifler için saklayabilirsin.</p>
<h2>3. Mutfaktan gelenler</h2>
<p>Kokteyllerin kalitesini çoğu zaman şişeler değil taze malzemeler belirler. Taze sıkılmış limon ve misket limonu suyu, hazır şişelenmiş meyve sularından çok daha iyi sonuç verir. Şeker şurubu evde iki dakikada hazırlanır (bkz. <a href="/rehber/ev-yapimi-surup.html">Evde Şurup Yapımı</a>). Soda, tonik ve zencefilli gazoz gibi gazlı içecekleri küçük şişelerde almak, açıldıktan sonra gazının kaçmasını önler. Nane, portakal ve bir paket angostura (aromatik bitter) da elinin altında bulunsun.</p>
<h2>4. Buz: en çok ihmal edilen malzeme</h2>
<p>Buz, kokteylin hem soğumasını hem de doğru miktarda sulanmasını sağlar. Dondurucuda koku almış ya da çok küçük buzlar hızlı erir ve içeceği sulandırır. Mümkünse temiz suyla, büyük kalıplarda buz yap ve kokteyl için bol kullan: shaker’ı ağzına kadar doldurmak, az buz koymaktan daha az sulanma sağlar.</p>
<h2>5. Ekipman</h2>
<p>Başlangıç için bir shaker, bir jigger (ölçü kabı), bir süzgeç ve uzun bir bar kaşığı yeterlidir. Ayrıntılar için <a href="/rehber/bar-ekipmanlari.html">Temel Bar Ekipmanları</a> rehberine göz atabilirsin. Shaker yoksa kapağı sıkı kapanan bir kavanoz, jigger yoksa ölçülü bir kaşık geçici olarak işini görür.</p>
<h2>6. Bardaklar</h2>
<p>Her tarif için ayrı bardak almana gerek yok. Bir set kısa bardak (old fashioned), bir set uzun bardak (highball) ve birkaç sapı uzun kadeh (coupe veya martini kadehi) tariflerin neredeyse tamamını karşılar. Hangi bardağın neden kullanıldığını <a href="/rehber/kokteyl-bardaklari.html">Kokteyl Bardakları</a> rehberinde anlattık.</p>
<h2>7. Küçük başla, sonra büyüt</h2>
<p>İlk ay birkaç tarifi tekrar tekrar yapmak, ölçüleri kendi damak zevkine göre ayarlamayı öğretir. Sonra her yeni şişeyi, en az üç yeni tarif açacak şekilde seç. Bu yöntemle hem bütçeni korursun hem de barındaki her şişe gerçekten kullanılır. Ve unutma: kokteyller paylaşmak içindir; misafirlerine alkolsüz seçenekler sunmayı ve alkolü ölçülü tüketmeyi ihmal etme.</p>`
    },
    {
        slug: 'bar-ekipmanlari', title: 'Temel Bar Ekipmanları',
        description: 'Shaker, jigger, süzgeç, bar kaşığı ve diğer bar ekipmanları ne işe yarar? Evde kokteyl için gerçekten gerekenler.',
        html: `<p>Profesyonel barlarda onlarca alet görebilirsin, ancak evde kokteyl hazırlamak için birkaç temel ekipman yeterlidir. Bu rehberde her aletin ne işe yaradığını, hangisinin gerçekten gerekli olduğunu ve yokluğunda neyi kullanabileceğini anlatıyoruz.</p>
<h2>Shaker (çalkalayıcı)</h2>
<p>Shaker, içeceği buzla birlikte kuvvetlice çalkalayarak hem soğutur hem havalandırır hem de malzemeleri tamamen karıştırır. İki yaygın türü vardır. <strong>Boston shaker</strong>, metal bir kap ile ona geçen ikinci bir kaptan oluşur; büyük, hızlı ve sızdırmaz olduğu için barmenlerin tercihidir. <strong>Cobbler shaker</strong> ise üç parçalıdır ve kendi süzgeciyle gelir; evde kullanımı daha kolaydır ancak soğuyunca kapağı sıkışabilir. Başlangıç için hangisi eline daha rahat geliyorsa onu seç.</p>
<h2>Jigger (ölçü kabı)</h2>
<p>Kokteyller oran işidir: birkaç mililitrelik fark, ekşi bir tarifi çok ekşi ya da çok tatlı yapabilir. Jigger, iki ucunda farklı hacimler bulunan küçük bir ölçü kabıdır; Türkiye’de genellikle 2 cl / 4 cl veya 3 cl / 5 cl ölçülü modeller bulunur. Bar Cepte’deki tarifler cl cinsinden verildiği için, iç yüzeyinde ara çizgiler olan bir jigger işini çok kolaylaştırır.</p>
<h2>Süzgeç (strainer)</h2>
<p><strong>Hawthorne süzgeç</strong>, kenarında yay bulunan ve shaker’ın ağzına oturan süzgeçtir; buzu ve iri parçaları tutar. <strong>İnce süzgeç</strong> (çay süzgecine benzer) ise küçük buz kırıntılarını, meyve posasını ve nane parçalarını tutmak için kullanılır. İkisini birlikte kullanarak yapılan “çift süzme”, özellikle sapı uzun kadehlerde servis edilen kokteyllerde pürüzsüz bir doku sağlar.</p>
<h2>Bar kaşığı ve karıştırma bardağı</h2>
<p>Martini, Manhattan ve Negroni gibi yalnızca içkilerden oluşan kokteyller çalkalanmaz, buzla karıştırılır. Bunun için uzun saplı, ince bir bar kaşığı ve kalın tabanlı bir karıştırma bardağı kullanılır. Karıştırma bardağı yoksa shaker’ın büyük kabı ya da sağlam bir uzun bardak da olur. Nedenini <a href="/rehber/calkalama-mi-karistirma-mi.html">Çalkalama mı Karıştırma mı?</a> rehberinde anlattık.</p>
<h2>Havan (muddler)</h2>
<p>Mojito’daki nane ya da Caipirinha’daki misket limonu gibi malzemeleri bardağın dibinde ezerek aromasını çıkarmaya yarar. Naneyi ezerken hafif bastırmak yeterlidir; fazla ezilen nane acılaşır. Ahşap bir havan ya da oklava ucu iş görür.</p>
<h2>Narenciye sıkacağı ve soyacak</h2>
<p>Taze meyve suyu kokteyllerin kalitesini en çok artıran malzemedir; bu yüzden el tipi bir narenciye sıkacağı en değerli küçük yatırımlardan biridir. Bir sebze soyacağı ise portakal ya da limon kabuğundan süsleme için ince şeritler çıkarmanı sağlar; kabuğu bardağın üzerinde hafifçe bükmek, yağlarını içeceğe ve bardağın kenarına bırakır.</p>
<h2>Blender</h2>
<p>Frozen Daiquiri, Piña Colada ve smoothie gibi buzlu, köpüklü içecekler için gerekir. Buz kırabilen güçlü bir mutfak blender’ı yeterlidir.</p>
<h2>Gerçekten ihtiyacın olan liste</h2>
<p>Özetle başlangıç için: bir shaker, bir jigger, bir Hawthorne süzgeç, bir bar kaşığı ve bir narenciye sıkacağı. Bunlarla Bar Cepte’deki tariflerin neredeyse tamamını hazırlayabilirsin. Diğer aletleri, sevdiğin tarifler gerektirdikçe zamanla ekleyebilirsin.</p>`
    },
    {
        slug: 'kokteyl-bardaklari', title: 'Kokteyl Bardakları Rehberi',
        description: 'Kısa bardak, uzun bardak, martini kadehi, coupe, şampanya kadehi: hangi kokteyl hangi bardakta servis edilir ve neden?',
        html: `<p>Bardak seçimi sadece görünüş meselesi değildir. Bardağın şekli içeceğin ne kadar soğuk kalacağını, kokusunun nasıl hissedileceğini ve içerken ne kadar buz kullanılacağını belirler. Bu rehberde Bar Cepte tariflerinde en sık geçen bardakları ve hangi içecekler için uygun olduklarını anlatıyoruz.</p>
<h2>Kısa bardak (old fashioned / rocks)</h2>
<p>Kalın tabanlı, kısa ve geniş ağızlı bir bardaktır. İçkinin ön planda olduğu, büyük bir buz küpüyle ya da buz üzerine servis edilen kokteyller içindir: Old Fashioned, Negroni, Whiskey Sour ve White Russian bunlara örnektir. Kalın tabanı, Caipirinha gibi bardağın içinde malzeme ezilen tarifler için de uygundur.</p>
<h2>Uzun bardak (highball ve collins)</h2>
<p>Highball, bol buz ve gazlı içecekle uzatılan basit karışımlar için kullanılır: Cin Tonik, Cuba Libre, Screwdriver gibi. Collins bardağı biraz daha uzun ve incedir; Tom Collins ve Mojito gibi gazlı, ferah kokteyllerde tercih edilir. Uzun ve dar yapı, gazın daha yavaş kaçmasını sağlar.</p>
<h2>Martini kadehi ve coupe</h2>
<p>Sapı uzun bu kadehler buzsuz servis edilen, önceden soğutulmuş kokteyller içindir. Sap, elinin sıcaklığının içeceği ısıtmasını önler. V şeklindeki klasik martini kadehi Martini ve Cosmopolitan ile özdeşleşmiştir; yuvarlak ve sığ coupe kadehi ise dökülmeye daha dayanıklıdır ve Daiquiri, Sidecar gibi kokteyllerde sık kullanılır. Nick &amp; Nora kadehi, coupe’nin daha küçük ve derin bir türüdür.</p>
<h2>Şampanya kadehi (flüt)</h2>
<p>Uzun ve dar flüt kadeh, köpüklü şarapların gazını korur. Mimosa, Bellini, Kir Royale ve French 75 gibi köpüklü kokteyller bu kadehte servis edilir.</p>
<h2>Margarita kadehi</h2>
<p>Geniş ağızlı, basamaklı bu kadeh, kenarına tuz ya da şeker sürmeye uygundur. Margarita’nın yanında buzlu (frozen) kokteyller için de kullanılır. Elinde yoksa Margarita’yı coupe kadehte ya da buzla kısa bardakta da servis edebilirsin.</p>
<h2>Tropikal (hurricane) bardak</h2>
<p>Kıvrımlı, uzun bir bardaktır; Piña Colada ve Hurricane gibi meyveli, buzlu tropikal kokteyller için kullanılır. Bol süsleme ve pipetle servis edilir.</p>
<h2>Bakır kupa</h2>
<p>Moscow Mule ile özdeşleşmiş bakır kupa, metal yapısı sayesinde içeceği çok soğuk hissettirir. İçi kalaylı ya da paslanmaz çelik kaplı kupalar tercih edilmelidir; asitli içecekler kaplamasız bakırla uzun süre temas etmemelidir.</p>
<h2>Sıcak içecek kupası ve İrlanda kadehi</h2>
<p>Irish Coffee ve sıcak şarap gibi içecekler ısıya dayanıklı, saplı cam bardak ya da kupalarda servis edilir. Cam bardağı önce sıcak suyla ısıtmak, içeceğin daha uzun sıcak kalmasını sağlar.</p>
<h2>Shot bardağı</h2>
<p>Küçük, kalın tabanlı bu bardaklar tek yudumda içilen shot’lar ve katmanlı içecekler için kullanılır. Katman yaparken her içkiyi bir kaşığın sırtından yavaşça dökmek, yoğunluk farkı sayesinde katmanların ayrı kalmasını sağlar.</p>
<h2>Elinde yoksa</h2>
<p>Doğru bardak keyfi artırır ama şart değildir. Önemli olan sıcaklık ve buz mantığıdır: buzlu tarifler için kalın, geniş bir bardak; buzsuz ve soğuk servis edilenler için sapı olan bir kadeh; gazlı içecekler için uzun ve dar bir bardak kullanmak yeterlidir. Kadehleri servis öncesi birkaç dakika dondurucuda ya da buzlu suyla soğutmak, her kokteyli daha iyi yapar.</p>`
    },
    {
        slug: 'calkalama-mi-karistirma-mi', title: 'Çalkalama mı Karıştırma mı?',
        description: 'Hangi kokteyl çalkalanır, hangisi karıştırılır, hangisi doğrudan bardakta hazırlanır? Temel kokteyl teknikleri.',
        html: `<p>Kokteyl tariflerinde en sık geçen iki fiil “çalkalayın” ve “karıştırın”dır. İkisi de içeceği soğutur ve bir miktar sulandırır, ancak sonuçları farklıdır. Hangi tekniğin ne zaman kullanılacağını bilmek, tarifi doğru uygulamanın en önemli adımıdır.</p>
<h2>Çalkalama (shake)</h2>
<p>Shaker’ı buzla doldurup malzemeleri 10–15 saniye kuvvetlice çalkalamak, içeceği hızla soğutur, sulandırır ve içine hava katar. Bu yüzden çalkalanan kokteyller hafif köpüklü ve bulanık görünür.</p>
<p><strong>Kural:</strong> Tarifte meyve suyu, şurup, süt veya krema, yumurta akı ya da likör gibi yoğun malzemeler varsa çalkala. Margarita, Daiquiri, Whiskey Sour, Cosmopolitan ve Espresso Martini çalkalanan kokteyllere örnektir. Çalkalama, bu farklı yoğunluktaki malzemelerin tamamen karışmasını sağlar.</p>
<h2>Kuru çalkalama (dry shake)</h2>
<p>Yumurta akı içeren tariflerde (örneğin Pisco Sour ya da Clover Club) malzemeler önce buzsuz çalkalanır, sonra buz eklenip tekrar çalkalanır. Buzsuz çalkalama yumurta akının daha iyi köpürmesini sağlar ve içeceğin üzerinde yoğun bir köpük katmanı oluşturur. Çiğ yumurta kullanırken taze ve güvenilir yumurta seçmeye dikkat et.</p>
<h2>Karıştırma (stir)</h2>
<p>Karıştırma bardağını buzla doldurup malzemeleri bar kaşığıyla 20–30 saniye boyunca yavaşça döndürmek, içeceği soğutur ve sulandırır ama içine hava katmaz. Sonuç berrak, ipeksi ve ağırlıklı bir içecektir.</p>
<p><strong>Kural:</strong> Tarif yalnızca içkilerden oluşuyorsa (damıtılmış içki, vermut, bitter, likör) karıştır. Martini, Manhattan, Negroni ve Old Fashioned karıştırılan kokteyllerdir. Bu kokteylleri çalkalamak yanlış değildir ama içecek bulanıklaşır ve dokusu değişir.</p>
<h2>Doğrudan bardakta hazırlama (build)</h2>
<p>Highball tarzı içeceklerde malzemeler doğrudan buzla dolu servis bardağına dökülür ve hafifçe karıştırılır. Cin Tonik, Cuba Libre, Moscow Mule ve Screwdriver böyle hazırlanır. Gazlı içecekleri shaker’da çalkalama: gaz kaçar ve shaker basınçla açılabilir. Gazlı malzeme her zaman en son ve yavaşça eklenir.</p>
<h2>Ezme (muddle)</h2>
<p>Nane, meyve ya da şeker gibi malzemeler bardağın ya da shaker’ın dibinde havanla ezilerek aromaları çıkarılır. Mojito’da naneyi hafifçe bastırmak yeterlidir; parçalamak acı bir tat bırakır. Caipirinha’da ise misket limonu dilimleri şekerle birlikte daha kuvvetli ezilir.</p>
<h2>Blender ile hazırlama</h2>
<p>Frozen Daiquiri ve Piña Colada gibi buzlu içecekler malzemelerin bir avuç buzla birlikte blender’da pürüzsüz olana kadar çekilmesiyle hazırlanır. Fazla buz içeceği tatsızlaştırır; önce az buzla başlayıp kıvamı ayarlamak daha iyidir.</p>
<h2>Sulanma neden önemli?</h2>
<p>Buzun erimesiyle içeceğe karışan su bir hata değil, tarifin bir parçasıdır. Doğru miktarda sulanma alkolün sertliğini yumuşatır ve tatları dengeler. Bu yüzden bol ve sert buz kullanmak, süreyi tarifte belirtildiği gibi tutmak önemlidir. Bar Cepte’deki Sayaç özelliği, çalkalama ve karıştırma sürelerini tutmana yardımcı olur.</p>`
    },
    {
        slug: 'ev-yapimi-surup', title: 'Evde Şurup Yapımı',
        description: 'Şeker şurubu, zengin şurup, bal şurubu, zencefil ve grenadin: kokteyller için ev yapımı şuruplar nasıl hazırlanır?',
        html: `<p>Pek çok kokteyl tarifinde geçen “şeker şurubu”, toz şekerin soğuk içkilerde zor erimesi nedeniyle kullanılır. Hazır şurup almak yerine evde birkaç dakikada, çok daha ucuza hazırlayabilirsin. Bu rehberde en sık kullanılan şurupları ve saklama koşullarını anlatıyoruz.</p>
<h2>Basit şeker şurubu (1:1)</h2>
<p>Bir ölçü toz şekeri bir ölçü suyla bir tencereye koy ve şeker tamamen eriyene kadar kısık ateşte karıştır; kaynatmana gerek yoktur. Soğuduktan sonra temiz bir şişeye aktar. Daiquiri, Mojito, Whiskey Sour ve Tom Collins gibi tariflerdeki “şeker şurubu” budur. Buzdolabında kapalı şişede yaklaşık iki hafta dayanır.</p>
<h2>Zengin şurup (2:1)</h2>
<p>İki ölçü şeker ve bir ölçü suyla hazırlanır. Daha yoğun ve daha tatlı olduğu için tarifteki miktarın yaklaşık üçte ikisi yeterlidir. Daha az su içerdiği için daha uzun süre bozulmadan kalır ve Old Fashioned gibi karıştırılan kokteyllerde ipeksi bir doku verir.</p>
<h2>Esmer şeker ve demerara şurubu</h2>
<p>Beyaz şeker yerine esmer ya da demerara şeker kullanılarak hazırlanır. Karamelli tadı koyu romlu ve viskili kokteyllerle çok iyi uyum sağlar.</p>
<h2>Bal şurubu</h2>
<p>Bal soğuk içkilerde topaklanır; bu yüzden eşit miktarda ılık suyla karıştırılarak inceltilir. Bal şurubu, cin ve limonla yapılan ekşilerde ve viskili Penicillin gibi tariflerde kullanılır. Balın aroması güçlü olduğu için çiçek balı gibi daha hafif çeşitler dengeli sonuç verir.</p>
<h2>Zencefil şurubu</h2>
<p>Bir ölçü ince doğranmış taze zencefili, bir ölçü şeker ve bir ölçü suyla birlikte 10–15 dakika kısık ateşte kaynat, soğuyunca süz. Soda ile karıştırıldığında ev yapımı zencefilli gazoz olur; viskili ve romlu kokteyllere de baharatlı bir sıcaklık katar.</p>
<h2>Ev yapımı grenadin</h2>
<p>Grenadin aslında nar şurubudur. Bir ölçü nar suyunu bir ölçü şekerle eriyene kadar ısıt; isteğe bağlı olarak birkaç damla portakal çiçeği suyu ekle. Hazır grenadinlerin çoğu yapay renklendiricili şekerli şuruplardır; ev yapımı olan hem daha doğal hem de daha ekşimsi bir tat verir. Tequila Sunrise ve Shirley Temple gibi tariflerde kullanılır.</p>
<h2>Aromalı şuruplar</h2>
<p>Basit şurubu hazırlarken içine nane, biberiye, tarçın çubuğu ya da vanilya ekleyip soğurken demlendirerek aromalı şuruplar elde edebilirsin. Süzdükten sonra etiketleyip buzdolabında sakla.</p>
<h2>Saklama ve hijyen</h2>
<p>Şurupları her zaman kaynar suyla çalkalanmış temiz şişelerde ve buzdolabında sakla. Şurup bulanıklaşırsa, kokusu değişirse ya da yüzeyinde küf görürsen kullanma. Küçük miktarlarda hazırlamak, her zaman taze şurupla çalışmanın en kolay yoludur. Bir yemek kaşığı votka eklemek raf ömrünü biraz uzatır.</p>
<h2>Şeker miktarını ayarlamak</h2>
<p>Tariflerdeki şurup miktarı ortalama bir damak zevkine göredir. Limonların ekşiliği mevsime göre değiştiği için kokteyli tadıp şurubu yarım ölçü artırmak ya da azaltmak normaldir. İyi bir ekşi kokteylin sırrı, tatlılık ve ekşilik arasındaki bu dengedir.</p>`
    },
    {
        slug: 'kokteyl-terimleri', title: 'Kokteyl Terimleri Sözlüğü',
        description: 'Dash, twist, neat, on the rocks, sour, highball, bitter ve daha fazlası: kokteyl tariflerinde geçen terimlerin Türkçe açıklamaları.',
        html: `<p>Kokteyl tarifleri, çoğu İngilizceden gelen kendine özgü bir dil kullanır. Bu sözlükte Bar Cepte tariflerinde ve barlarda en sık karşılaşacağın terimleri Türkçe olarak açıklıyoruz.</p>
<dl>
<dt>Bitter (aromatik bitter)</dt><dd>Bitki, kök ve baharatlardan yapılan, damla damla kullanılan yoğun aromalı acı özler. En bilineni Angostura’dır. Old Fashioned ve Manhattan gibi kokteyllere derinlik katar.</dd>
<dt>Build (bardakta hazırlama)</dt><dd>Malzemelerin doğrudan servis bardağına buz üzerine dökülerek hazırlanması. Highball tarzı içeceklerde kullanılır.</dd>
<dt>Dash (damla)</dt><dd>Bitter şişesinden tek bir sallamayla düşen miktar; yaklaşık birkaç damla. Tariflerde “2 dash Angostura” gibi geçer.</dd>
<dt>Dry (kuru)</dt><dd>Şekeri az anlamına gelir. “Dry Martini” daha az vermutla yapılan, daha keskin bir Martini’dir. Kuru vermut da tatlı vermuta göre daha az şekerlidir.</dd>
<dt>Dry shake (kuru çalkalama)</dt><dd>Yumurta akı içeren tariflerde malzemelerin önce buzsuz çalkalanması. Daha yoğun bir köpük sağlar.</dd>
<dt>Fizz</dt><dd>Ekşi bir kokteylin soda ile uzatılmış, köpüklü hali. Gin Fizz en bilinen örneğidir.</dd>
<dt>Float (üstüne yüzdürme)</dt><dd>Bir içkinin, karışımın üzerine bir kaşığın sırtından yavaşça dökülerek ayrı bir katman halinde bırakılması.</dd>
<dt>Garnish (süsleme)</dt><dd>Kokteylin üzerine eklenen limon dilimi, kabuk, nane yaprağı, kiraz gibi süsler. Çoğu zaman yalnızca görüntü için değil, koku için de önemlidir.</dd>
<dt>Highball</dt><dd>Bir içkinin bol buz ve gazlı bir içecekle uzun bardakta uzatılmasıyla yapılan basit kokteyl türü; aynı adı taşıyan uzun bardak.</dd>
<dt>Jigger</dt><dd>İki ucunda farklı hacimler bulunan ölçü kabı. Tariflerde bazen ölçü birimi olarak da geçer (yaklaşık 4,5 cl).</dd>
<dt>Muddle (ezme)</dt><dd>Nane, meyve veya şeker gibi malzemelerin bardağın dibinde havanla ezilerek aromasının çıkarılması.</dd>
<dt>Neat (sek)</dt><dd>Bir içkinin buzsuz ve karıştırılmadan, oda sıcaklığında servis edilmesi.</dd>
<dt>On the rocks (buzla)</dt><dd>Bir içkinin ya da kokteylin buz küpleri üzerine servis edilmesi.</dd>
<dt>Part (ölçü)</dt><dd>Oran olarak verilen tariflerde kullanılan birim. “2 ölçü rom, 1 ölçü limon” ifadesinde ölçü olarak hangi kabı kullanırsan kullan, oran korunur.</dd>
<dt>Rim (kenar kaplama)</dt><dd>Bardağın kenarının limonla ıslatılıp tuz ya da şekere batırılması. Margarita’nın tuzlu kenarı en bilinen örnektir.</dd>
<dt>Shot</dt><dd>Tek yudumda içilen küçük içecek; ayrıca yaklaşık 3–4,5 cl’lik ölçü anlamında da kullanılır.</dd>
<dt>Sour (ekşi)</dt><dd>İçki, limon ya da misket limonu suyu ve şekerden oluşan kokteyl ailesi. Whiskey Sour, Daiquiri ve Margarita bu ailenin üyeleridir.</dd>
<dt>Splash (bir miktar)</dt><dd>Tarifte ölçü belirtilmeden, az miktarda eklenecek malzeme; genellikle 1–2 cl.</dd>
<dt>Stir (karıştırma)</dt><dd>Malzemelerin buzla birlikte bar kaşığıyla yavaşça döndürülmesi. Yalnızca içkilerden oluşan kokteyllerde kullanılır.</dd>
<dt>Strain (süzme)</dt><dd>Çalkalanan ya da karıştırılan içeceğin buzdan ayrılarak bardağa aktarılması. İnce süzgeçle ikinci kez süzmeye “double strain” denir.</dd>
<dt>Twist (kabuk)</dt><dd>Limon ya da portakal kabuğundan kesilen ince şerit. Bardağın üzerinde bükülerek yağları içeceğe sıkılır, sonra süs olarak eklenir.</dd>
<dt>Up (buzsuz, soğuk)</dt><dd>Buzla çalkalanıp ya da karıştırılıp buzsuz, sapı uzun bir kadehte servis edilen kokteyl.</dd>
<dt>Vermut</dt><dd>Bitki ve baharatlarla aromalandırılmış, güçlendirilmiş şarap. Tatlı (kırmızı) ve kuru (beyaz) türleri vardır; açıldıktan sonra buzdolabında saklanmalıdır.</dd>
</dl>
<p>Tariflerde anlamını bilmediğin bir terim görürsen bu sayfaya dönebilirsin. Teknikler hakkında daha fazlası için <a href="/rehber/calkalama-mi-karistirma-mi.html">Çalkalama mı Karıştırma mı?</a> rehberine göz at.</p>`
    },
    {
        slug: 'sorumlu-tuketim', title: 'Sorumlu Tüketim ve Alkolsüz Seçenekler',
        description: 'Kokteyl keyfini sorumlu yaşamak için pratik öneriler ve alkolsüz alternatifler.',
        html: `<p>Kokteyl hazırlamak bir zanaat ve paylaşım keyfidir; amaç sarhoş olmak değil, iyi bir tadın tadını çıkarmaktır. Bu sayfada alkolü sorumlu tüketmek için bazı pratik önerileri ve alkolsüz seçenekleri bir araya getirdik.</p>
<h2>Yasal yaş ve güvenlik</h2>
<p>Türkiye’de 18 yaşından küçüklere alkollü içki satışı ve sunumu yasaktır. Bar Cepte’deki alkollü tarifler yalnızca yetişkinler içindir. Alkol aldıysan araç kullanma; misafirlerinin eve güvenli şekilde dönmesini sağla. Hamilelik, emzirme, bazı ilaçların kullanımı ve sağlık sorunları gibi durumlarda alkolden tamamen kaçınmak gerekir.</p>
<h2>Ölçülü içmek için öneriler</h2>
<p>Jigger kullanmak sadece tadı değil, içtiğin alkol miktarını da kontrol etmeni sağlar. Göz kararı dökülen içkiler çoğu zaman tarifte yazandan çok daha fazladır. Her kokteylin yanında bir bardak su içmek, aç karnına içmemek ve kokteylleri yavaş, sohbet ederek tüketmek iyi alışkanlıklardır. Bar Cepte’deki tarif kartlarında gösterilen yaklaşık alkol oranı (ABV), hangi kokteylin daha hafif olduğunu görmene yardımcı olur.</p>
<h2>Daha hafif kokteyller</h2>
<p>Highball tarzı uzun içecekler (bir ölçü içki ve bol soda ya da tonik) ve şarap bazlı kokteyller, sek içki ağırlıklı kokteyllere göre daha düşük alkollüdür. Spritz ve sangria gibi içecekleri bol buz ve soda ile hazırlamak da alkol oranını düşürür.</p>
<h2>Alkolsüz seçenekler</h2>
<p>İyi bir ev sahibi her zaman alkolsüz bir seçenek sunar. Bar Cepte’de <a href="/tarif/kategori/alkolsuz.html">alkolsüz tarifler</a> bölümünde limonatalar, meyve kokteylleri, smoothie’ler ve sıcak içecekler bulabilirsin. Birçok klasik kokteylin alkolsüz versiyonunu da hazırlamak mümkündür: Mojito’yu romsuz, nane, misket limonu, şeker ve soda ile yapabilir; Moscow Mule’ü votka yerine bol misket limonu ve zencefilli gazozla hazırlayabilirsin.</p>
<h2>Yardım almak</h2>
<p>Alkol kullanımının kontrolden çıktığını düşünüyorsan yalnız değilsin. Aile hekimine ya da bir uzmana danışmak ilk adımdır; Türkiye’de Yeşilay Danışmanlık Merkezi (YEDAM) ücretsiz destek sunmaktadır.</p>`
    }
];

// Short hand-written tips for well-known recipes (keyed by strDrink).
const TIPS = {
    Mojito: 'Naneyi ezmek yerine avucunun içinde hafifçe sıkıp bardağa koyman yeterli; fazla ezilen nane acılaşır. Sodayı en son ekle ve buzla birlikte bir kez yukarı doğru karıştır.',
    Margarita: 'Bardağın kenarının yalnızca dış yarısına tuz sürersen, tuz içeceğe karışmaz ve isteyen tuzsuz taraftan içebilir. Taze misket limonu suyu bu tarifte en önemli malzemedir.',
    Daiquiri: 'Klasik Daiquiri buzlu değil, çalkalanıp buzsuz servis edilir. Misket limonu ile şurup dengesini tadarak ayarla; iyi bir Daiquiri ne çok ekşi ne çok tatlı olmalıdır.',
    Negroni: 'Eşit oranlı olduğu için ezberlemesi en kolay klasiklerden biridir. Büyük tek bir buz küpü daha yavaş erir ve içeceğin dengesini daha uzun korur. Portakal kabuğunu bardağın üzerinde bükmeyi unutma.',
    'Old Fashioned': 'Viski ön planda olduğu için iyi bir burbon ya da çavdar viskisi kullan. Karıştırma süresi en az 20–30 saniye olmalı; bu sayede viskinin sertliği yumuşar.',
    Martini: 'Martini’yi çalkalamak yerine karıştırmak berrak ve ipeksi bir içecek verir. Kadehi önceden dondurucuda soğut; vermut miktarını damak zevkine göre azaltıp artırabilirsin.',
    'Dry Martini': 'Vermut oranı azaldıkça Martini daha “kuru” olur. Vermut şişesini açtıktan sonra buzdolabında sakla; oksitlenen vermut Martini’nin tadını bozar.',
    Manhattan: 'Çavdar viskisi daha baharatlı, burbon daha tatlı bir Manhattan verir. Karıştırarak hazırla ve kokteyl kirazıyla servis et.',
    'Whiskey Sour': 'Yumurta akı eklersen önce buzsuz çalkala, sonra buzla tekrar çalkala. Üstte oluşan köpüğe birkaç damla Angostura damlatmak klasik bir süslemedir.',
    Cosmopolitan: 'Kızılcık suyunun miktarı rengi ve tatlılığı belirler; tarifteki ölçüyü aşma. Portakal kabuğuyla servis et.',
    'Moscow Mule': 'Zencefilli gazozun keskin olanı bu tarifi canlı tutar. Bakır kupa yoksa uzun bir bardak ve bol buz da iş görür.',
    'Pina Colada': 'Blender’a önce sıvıları, sonra buzu koy. Kıvamı fazla koyulaşırsa biraz ananas suyu ekleyerek açabilirsin.',
    'Espresso Martini': 'Kahveyi taze demleyip hafifçe soğut. Kuvvetli çalkalamak üstte ince bir kahve köpüğü oluşturur.',
    'Long Island Iced Tea': 'Çok sayıda içki içerdiği için alkol oranı yüksektir; ölçüleri jiggerla tam tut ve kolayı en son ekle.',
    'Tom Collins': 'Uzun bardakta bol buzla hazırlanır. Sodayı ekledikten sonra sadece bir kez karıştır ki gazı kaçmasın.',
    'Cuba Libre': 'Misket limonunu yalnızca sıkma, bir dilimini de bardağa at. Kolanın soğuk olması içeceğin sulanmasını azaltır.',
    Caipirinha: 'Misket limonunu dörde kesip beyaz orta kısmını çıkar; bu kısım acılık verir. Şekerle birlikte bardakta ezip kırık buzla doldur.',
    'Mai Tai': 'Orijinal tarifte badem şurubu (orgeat) kullanılır. Ezilmiş buz ve bol nane süslemesiyle servis edilir.',
    Sidecar: 'Bardağın kenarına şeker sürmek isteğe bağlıdır. Konyak ve portakal likörü oranını tadarak ayarlayabilirsin.',
    Mimosa: 'Önce portakal suyunu, ardından köpüklü şarabı yavaşça dök. Karıştırma; köpük içeceği zaten karıştırır.',
    Bellini: 'Klasik tarifte beyaz şeftali püresi kullanılır. Püre ve köpüklü şarabın soğuk olması önemlidir.',
    'White Russian': 'Kremayı kaşığın sırtından yavaşça dökersen üstte güzel bir katman oluşur; içmeden önce karıştırabilirsin.',
    'Irish Coffee': 'Bardağı önce sıcak suyla ısıt. Kremayı hafifçe çırpıp kaşığın sırtından dökersen kahvenin üzerinde yüzer.',
    'Pisco Sour': 'Kuru çalkalama yumurta akıyla yoğun bir köpük verir. Üzerine birkaç damla aromatik bitter damlatılarak servis edilir.',
    Gimlet: 'Taze misket limonu suyu ve şurupla yapılan bu kısa tarifte dengeyi bulmak için şurubu az az ekle.',
    Paloma: 'Greyfurt gazozu yoksa taze greyfurt suyu ve soda kullanabilirsin. Kenarına tuz sürmek tadı canlandırır.',
    'Tequila Sunrise': 'Grenadini en son ve yavaşça dök; ağır olduğu için dibe çöker ve gün doğumu görüntüsünü oluşturur. Karıştırmadan servis et.',
    'French 75': 'Cin, limon ve şurubu çalkalayıp kadehe süz, ardından şampanyayla tamamla. Köpüklü şarabı shaker’a koyma.',
    Americano: 'Negroni’nin daha hafif kuzenidir; cin yerine soda kullanılır. Öğle saatleri için uygun, düşük alkollü bir aperatiftir.',
    Spritz: 'Önce köpüklü şarabı, sonra aperatifi, en son sodayı ekle. Bol buz ve bir portakal dilimi ile servis edilir.',
    Sangria: 'Meyveleri şarapla birlikte birkaç saat buzdolabında bekletmek tatların kaynaşmasını sağlar. Servis etmeden hemen önce soda ekle.'
};

module.exports = { INFO_PAGES, CATEGORIES, GUIDES, TIPS };
