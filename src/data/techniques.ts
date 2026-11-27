import type { Technique } from '../types';

export const DIFFICULTY_LABELS: Record<Technique['difficulty'], string> = {
  Başlangıç: 'Kolay',
  Orta: 'Orta',
  İleri: 'Uzman',
};

export const DIFFICULTY_ORDER: Record<Technique['difficulty'], number> = {
  Başlangıç: 1,
  Orta: 2,
  İleri: 3,
};

export const MECHANICS_GRIP_PRIMER = {
  title: 'Mekanik Tutuş (Mechanic’s Grip) Nedir?',
  summary:
    'Kart sihirbazlığına sıfırdan başlayan herkesin ilk öğrendiği temel deste tutuşudur. Desteyi sol elin (baskın olmayan el) avuç içinde güvenli, dengeli ve diğer parmakların gizli hareketler yapmasına izin verecek şekilde tutmayı sağlar.',
  points: [
    'Sol başparmak destenin sol uzun kenarının üstünde rahatça uzanır.',
    'İşaret parmağı destenin ön kısa kenarını hafifçe sarar; kartların öne kaymasını önler.',
    'Orta, yüzük ve serçe parmaklar sağ uzun kenarı tutar; serçe parmak gerektiğinde kart altına gizli boşluk (Break) açar.',
  ],
};

export const PRESET_TECHNIQUES: Technique[] = [
  {
    id: 'double-lift',
    name: 'Double Lift',
    title: 'Double Lift Nasıl Yapılır?',
    summary:
      'Destenin en üstündeki iki kartı tek bir kartmış gibi doğal şekilde kaldırıp çevirme ve gizlice geri bırakma tekniği.',
    difficulty: 'Orta',
    steps: [
      {
        number: 1,
        title: 'Mekanik Tutuş ve Pinky Break',
        detail:
          'Desteyi baskın olmayan elinde Mekanik Tutuşa (Mechanic’s Grip) al. Sağ başparmakla üstten iki kartı hafifçe yokla veya serçe parmak ucuyla iki kartın altında görünmez bir boşluk (Pinky Break) oluştur.',
        visualCue: 'Deste avuç içinde düz, serçe parmak ucu üstteki 2 kartın altında hafif kırık oluşturuyor.',
      },
      {
        number: 2,
        title: 'İki Kartı Tek Blokta Hizalama',
        detail:
          'Kaldırmadan önce başparmak ve orta parmağınla üstteki iki kartın kenarlarını desteye nazikçe bastırarak sıfır taşma olacak şekilde hizala; tek kart kalınlığı illüzyonu burada başlar.',
        visualCue: 'Üstteki iki kartın kenarları tamamen bitişik, arada boşluk veya kayma görünmüyor.',
      },
      {
        number: 3,
        title: 'Çift Kartı Sağdan Kavrama',
        detail:
          'Sağ elinin başparmağını alt kenara, orta ve yüzük parmaklarını üst sağ köşeye yerleştir. İki kartı destenin üzerinden yukarı değil, hafifçe sağa ve yatay yay çizerek tek parça gibi kaldır.',
        visualCue: 'Sağ el üst 2 kartı köşelerden tutmuş, iki kart ayrılmadan tek bir blok halinde kalkıyor.',
      },
      {
        number: 4,
        title: 'Doğal Çevirme ve Gösterme',
        detail:
          'Kartı izleyiciye göstermek için kitabın sayfasını çevirir gibi destenin sol kenarını destek alarak yüzü yukarı çevir. Parmaklarını sıkmadan gevşek tut ki iki kart arasında aralık açılmasın.',
        visualCue: 'Çift kart destenin üstüne yüzü dönük yatırılmış ve kenarları hala tek kart gibi hizalı.',
      },
      {
        number: 5,
        title: 'İz Bırakmadan Geri Bırakma',
        detail:
          'Kartı tekrar yüzü aşağı çevirirken destenin sol kenarına yasla, iki kartı aynı hizada bırak ve en üstteki tek kartı sanki gösterdiğin kartmış gibi masaya veya seyirciye uzat.',
        visualCue: 'Kartlar desteye sıfır taşma ile geri oturmuş, üst tek kart doğal biçimde ileri sürülmeye hazır.',
      },
    ],
  },
  {
    id: 'mechanics-grip',
    name: 'Mekanik Tutuş',
    title: 'Mekanik Tutuş (Mechanic’s Grip) Nasıl Yapılır?',
    summary:
      'Sıfırdan başlayanlar için tüm kart sihirbazlığı tekniklerinin temeli olan doğal, dengeli ve gizli hamlelere uygun deste tutuşu.',
    difficulty: 'Başlangıç',
    steps: [
      {
        number: 1,
        title: 'Avuç İçi Yerleşimi',
        detail:
          'Desteyi baskın olmayan elinin (genellikle sol el) avuç içine çapraz değil, parmak köklerine paralel olacak şekilde yerleştir; avuç içinde hafif nefes payı bırak.',
        visualCue: 'Deste sol elin orta kısmında düz duruyor, avuç içi çok sıkılmamış.',
      },
      {
        number: 2,
        title: 'İşaret Parmağı Ön Kilidi',
        detail:
          'Sol işaret parmağını bükerek destenin sana uzak olan ön kısa kenarının önüne koy. Bu parmak kartların öne kaymasını engeller ve desteyi çerçeveler.',
        visualCue: 'İşaret parmağı destenin ön kısa kenarına hafifçe temas ediyor.',
      },
      {
        number: 3,
        title: 'Başparmak Sol Kenar Kontrolü',
        detail:
          'Sol başparmağını destenin sol uzun kenarı boyunca üst yüzeye doğru rahatça uzat; kartları dağıtırken veya hizalarken başparmak buradan yön verecektir.',
        visualCue: 'Başparmak üst kartın sol kenarında doğal açıyla dinleniyor.',
      },
      {
        number: 4,
        title: 'Üç Parmak Sağ Kenar Desteği',
        detail:
          'Orta, yüzük ve serçe parmaklarını destenin sağ uzun kenarına eşit aralıklarla yasla. Parmak uçların kartların kenarından sadece birkaç milimetre taşmalıdır.',
        visualCue: 'Orta, yüzük ve serçe parmaklar sağ uzun kenarı düzgünce sarıyor.',
      },
      {
        number: 5,
        title: 'Gevşeklik ve Bilek Açısı',
        detail:
          'Desteyi sıkmadan tut ki kartlar birbirine yapışmasın. Bileğini yere paralel veya çok hafif içe dönük tutarak tüm hareketlere hazır başlangıç duruşunu sabitle.',
        visualCue: 'Bilek düz, parmaklar rahat ve deste tek parça halinde dengede duruyor.',
      },
    ],
  },
  {
    id: 'pinky-break',
    name: 'Pinky Break',
    title: 'Pinky Break Nasıl Yapılır?',
    summary:
      'Mekanik tutuş içindeyken destenin belirli bir noktasında serçe parmak ucuyla seyirciye görünmeyen gizli bir ayrım oluşturma tekniği.',
    difficulty: 'Başlangıç',
    steps: [
      {
        number: 1,
        title: 'Rahat Mekanik Tutuş',
        detail:
          'Desteyi sol avuç içine Mekanik Tutuşta yerleştir; işaret parmağı ön kısa kenarda, orta ve yüzük parmaklar sağ uzun kenarda dursun.',
        visualCue: 'Deste sol elde dengeli, parmaklar kasılmadan kenarları sarıyor.',
      },
      {
        number: 2,
        title: 'Üst Kartları Sayma veya Kesme',
        detail:
          'Sağ başparmağınla destenin arka köşesinden 1 veya 2 kartı hafifçe aşağı çekip bırakarak ayrım noktasını belirle.',
        visualCue: 'Sağ başparmak destenin arka sağ köşesinde kart ayrımını yakalıyor.',
      },
      {
        number: 3,
        title: 'Serçe Etini Yerleştirme',
        detail:
          'Sol serçe parmağının iç yumuşak etini belirlediğin kart paketinin tam altına sadece 1-2 milimetre sıkıştır.',
        visualCue: 'Serçe parmak ucu deste kenarında çok ince bir boşluğu sabit tutuyor.',
      },
      {
        number: 4,
        title: 'Ön ve Yan Açıyı Kapatma',
        detail:
          'İşaret parmağı ve başparmağını ön ve sol kenarları kapalı tutacak şekilde doğal konumda bırak; ayrım sadece arka sağ köşeden hissedilsin.',
        visualCue: 'Ön kenardan bakıldığında deste tek ve kesintisiz bir blok gibi görünüyor.',
      },
      {
        number: 5,
        title: 'Baskısız Sabit Tutma',
        detail:
          'Desteyi sıkarsan ayrım genişler ve belli olur. Bileğini hafifçe eğerek üst paketi rahat bırak ve sonraki hamleye hazır bekle.',
        visualCue: 'El doğal açıda, kırık noktası dışarıdan görünmeden korunuyor.',
      },
    ],
  },
  {
    id: 'hindu-shuffle',
    name: 'Hindu Shuffle',
    title: 'Hindu Shuffle Nasıl Yapılır?',
    summary:
      'Kartları akıcı paketler halinde sıyırarak karıştıran, kontrol ve peek için temel olan klasik karıştırma tekniği.',
    difficulty: 'Başlangıç',
    steps: [
      {
        number: 1,
        title: 'Sağ El Biddle Tutuşu',
        detail:
          'Desteyi sağ elinde uzun kenarlarından başparmak ve orta parmakla tut; işaret parmağı kartların sırtına hafifçe dokunsun.',
        visualCue: 'Sağ el desteyi uzun kenarlarından dengeli ve gevşek biçimde tutuyor.',
      },
      {
        number: 2,
        title: 'Sol Avuç Kabul Pozisyonu',
        detail:
          'Sol elini avuç içi yukarı bakacak şekilde aç ve parmaklarını sağ eldeki destenin altından küçük paketler alacak biçimde hazırla.',
        visualCue: 'Sol avuç destenin altında alıcı beşik şeklinde açık bekliyor.',
      },
      {
        number: 3,
        title: 'Üstten İnce Paket Sıyırma',
        detail:
          'Sol başparmağın ve orta parmağınla sağdaki destenin en üstündeki ince bir kart paketini nazikçe kavrayıp sol avucuna çek.',
        visualCue: 'Üstten ince bir kart grubu sol avuca düzgünce çekiliyor.',
      },
      {
        number: 4,
        title: 'Ritimli Seri Tekrar',
        detail:
          'Sağ eli küçük dairelerle ileri-geri hareket ettirerek sol parmakların her geçişte üstten yeni bir ince paket sıyırmasını sağla.',
        visualCue: 'Paketler sol avuçta kenarları dağılmadan üst üste birikiyor.',
      },
      {
        number: 5,
        title: 'Son Paketi Üste Bırakma',
        detail:
          'Sağ elde kalan son kart grubunu sol eldeki destenin üzerine düzgünce yerleştir ve iki elinle dört kenarı hafifçe hizala.',
        visualCue: 'Deste tek elde toplanmış ve dört kenarı pürüzsüz hizalanmış.',
      },
    ],
  },
  {
    id: 'elmsley-count',
    name: 'Elmsley Count',
    title: 'Elmsley Count (Hayalet Sayım) Nasıl Yapılır?',
    summary:
      'Eldeki 4 kartı dört kart gibi sayarken üçüncü kartı görünmez biçimde gizleme tekniği.',
    difficulty: 'Orta',
    steps: [
      {
        number: 1,
        title: 'Üç Parmak Köşe Tutuşu',
        detail:
          'Dört kartı sol elinin başparmağı üstte, orta ve yüzük parmakları altta olacak şekilde kısa arka kenarından hafifçe tut.',
        visualCue: '4 kart sol el parmak uçlarında yatay ve tamamen hizalı duruyor.',
      },
      {
        number: 2,
        title: 'İlk Kartı Sağa Alma',
        detail:
          'Sağ başparmağınla en üstteki 1. kartı sola doğru değil, doğrudan sağ elin tutuşuna kaydırarak al ve "Bir" diye say.',
        visualCue: 'Üstteki ilk kart sağ ele geçmiş, kalan 3 kart sol elde hizalı.',
      },
      {
        number: 3,
        title: 'Çift Bloğu İtme ve Takas',
        detail:
          'Sol başparmak ile ortadaki iki kartı tek bir blok halinde sağa it. Sağ parmaklar bu bloğu alırken alttaki ilk kartı sol el parmaklarının altına gizlice geri bırak.',
        visualCue: 'İki kartlık blok sağa geçerken alt kart sol ele geri alınıyor.',
      },
      {
        number: 4,
        title: 'Üçüncü Kartı Üstten Çekme',
        detail:
          'Sağ eldeki bloğun üstüne sol başparmağınla kalan kartı aynı ritimde çekerek "Üç" sayımını bozmadan tamamla.',
        visualCue: 'Kartlar aynı tempoda sağ elde üst üste biniyor, kenar kayması yok.',
      },
      {
        number: 5,
        title: 'Son Kartı Üste Yerleştirme',
        detail:
          'Sol elde kalan son kartı da ritmi hiç değiştirmeden en üste koyarak "Dört" say; tüm kartlar eşit görünmelidir.',
        visualCue: 'Tüm paket tek elde toplanmış ve 4 kart ritmi eşit tamamlanmış.',
      },
    ],
  },
  {
    id: 'classic-pass',
    name: 'Classic Pass',
    title: 'Classic Pass Nasıl Yapılır?',
    summary:
      'İki elin görünmez bir koordinasyonuyla destenin alt ve üst yarısının yerini sessizce değiştiren ileri seviye kart kontrolü.',
    difficulty: 'İleri',
    steps: [
      {
        number: 1,
        title: 'Derin Pinky Break Kurulumu',
        detail:
          'Desteyi Mekanik Tutuşa al ve kesme noktasında serçe parmağın iç kısmını iki paket arasına normalden biraz daha derin yerleştir.',
        visualCue: 'Sol el Mekanik Tutuşta, serçe parmak iki yarıyı net şekilde ayırıyor.',
      },
      {
        number: 2,
        title: 'Sağ El Örtü Kavraması',
        detail:
          'Sağ elini destenin üzerine tamamen kapatacak şekilde yerleştir; başparmak arka sol köşeyi, orta ve yüzük parmaklar ön sağ köşeyi tutsun.',
        visualCue: 'Sağ el üst paketi bütünüyle örtüyor, ön açı tamamen kapalı.',
      },
      {
        number: 3,
        title: 'Alt Paketi Yana Çekme',
        detail:
          'Sol serçe ve yüzük parmaklarını hafifçe açarak üst paketi sol avuç içine doğru aşağı çevirirken sağ el alt paketi dikey olarak yukarı kaldırır.',
        visualCue: 'İki paket sağ elin gölgesinde çarpışmadan birbirinin yanından geçiyor.',
      },
      {
        number: 4,
        title: 'Sessiz Kapanış ve Değişim',
        detail:
          'Alt paket üste geçip üst paket sol avuca oturduğunda parmakları sıkmadan ses çıkarmadan birleştir.',
        visualCue: 'Üst ve alt paket yer değiştirmiş, deste tek blok halinde kapanmış.',
      },
      {
        number: 5,
        title: 'Doğal Düzeltme ve Tempo',
        detail:
          'Hamle bittikten sonra sağ elinle destenin kenarlarını hafifçe okşayarak düzelt; hareketi tek bir nefes anında ve bakış yönlendirmesiyle tamamla.',
        visualCue: 'Deste dört kenardan tamamen hizalı ve doğal tutuşa dönmüş.',
      },
    ],
  },
];
