---
title: Salt Okunur Mod
---

# Salt Okunur Mod

Salt okunur mod, çizimleri yalnızca görüntülemek ve ölçmek içindir. DWG/DXF arka planı tamamen düzenlenemez; çizim ve değiştirme komutları kullanılamaz.

Salt okunur moda girildiğinde, arayüz düzenini cihaz türüne göre otomatik olarak uyarlar.

## Masaüstü

### Genel Düzen

Salt okunur modda Ribbon ve durum çubuğu yoktur. Arayüz tuval merkezlidir; tüm komutlara sağ taraftaki araç çubuğu ve yerleştirilmiş paneller üzerinden erişilir:

<ReviewModeLayout mode="readonly" />

### Sağ Taraf Araç Çubuğu

Tuvalin sağ tarafında yüzen dikey bir araç çubuğu — salt okunur modda birincil komut giriş noktası:

- Seç / Seçimi Kaldır
- Pan (el)
- Sınırlara Yakınlaştır
- Pencere Yakınlaştırma
- Ölçüm Araç Grubu (ölçüm panelini açar)
- Okuma Modu (tam ekran odak moduna girer)
- Açık/Koyu Arka Planı Değiştir

### Yerleştirilmiş Paneller

| Panel | Açıklama |
|---|---|
| Measurements | Geçerli çizimdeki tüm ölçümleri listeler; konumlandırmak için tıklayın |
| Entity Info | Seçili öğenin türünü, koordinatlarını ve özelliklerini gösterir |
| Statistics | Blok kullanım istatistikleri |
| Missing Resources | Eksik yazı tipleri veya dış referanslar için uyarılar |

## Tablet (Pad)

Tablet düzeni, masaüstü ve mobil arasındaki kompakt bir tasarımdır:

- Sağ taraf araç çubuğu korunur, ancak dokunma için düğme aralığı artırılır
- Yerleştirilmiş paneller varsayılan olarak simge çubuğuna daraltılır; yan çekmece olarak genişletmek için tıklayın

## Mobil

Mobil, **alt sekme çubuğu + çekmece paneli** tasarımı kullanır; tüm etkileşimi ekranın altında toplar ve üst kısmı tuval için bırakır.

### Alt Sekme Çubuğu

Ekranın altında dört simge düğmesi görüntülenir:

<MobileBottomTabBar mode="readonly" />

| Düğme | İşlev |
|---|---|
| Zoom | Yakınlaştırma araç grubu: yakınlaştır, uzaklaştır, sınırlara yakınlaştır, pencere yakınlaştırma |
| Measure | Ölçüm araç grubu: mesafe, sürekli mesafe, alan, koordinatlar, yay uzunluğu, açı |
| Layout | Düzeni değiştir |
| Setting | Ayarlar menüsü: tema, simüle fare, OSNAP, vb. |

### Tuval Alanı

Tuval ekranın üst kısmını doldurur. Bir ölçüm seçildiğinde, tuvalde bir ölçüm rozeti görüntülenir.

### Masaüstünden Farkları

Mobil, sağ taraf araç çubuğunu veya yerleştirilmiş panelleri görüntülemez; işlevleri alt sekme çubuğu ile değiştirilir.
