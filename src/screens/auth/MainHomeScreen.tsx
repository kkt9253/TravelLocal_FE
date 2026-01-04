import React, {useRef, useEffect, useState, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  Animated,
  Image,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AppStackParamList} from '../../navigations/AppNavigator';
import {useTranslation} from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width} = Dimensions.get('window');
type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

// ====== 충남 관광지 슬라이드 데이터 ======
type Spot = {title: string; imageUrl: string; url: string};
const CHUNGNAM_SPOTS: Spot[] = [
  {
    title: '부여 백제문화단지',
    imageUrl: 'https://www.bhm.or.kr/images/kr/visit/visit01_pic01_01b.jpg',
    url: 'https://www.bhm.or.kr/html/kr/#none',
  },
  {
    title: '예산 예산시장',
    imageUrl:
      'https://yesan.theborn.co.kr/files/bbs_kmagazine/4afd90c88669220cf6754e796eb53bff.jpg',
    url: 'https://yesan.theborn.co.kr/',
  },
  {
    title: '공주 무령왕릉과 왕릉원',
    imageUrl: 'https://www.gongju.go.kr/images/tour/sub01/sub010103_img01.jpg',
    url: 'https://www.gongju.go.kr/tour/sub01_01_03.do',
  },
  {
    title: '아산 외암민속마을',
    imageUrl:
      'https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=4258f80e-3b58-4fb2-aac3-653dee411b19',
    url: 'http://oeam.co.kr/main/', // http (iOS ATS 예외 필요 가능)
  },
  {
    title: '서산 해미읍성',
    imageUrl:
      'https://devin.aks.ac.kr/image/3574307c-6f28-47d8-882d-ef35a28b5cf9?preset=orig',
    url: 'https://www.seosan.go.kr/public/contents.do?key=837',
  },
];

// ====== 충청남도 시·군 이름 & 추천 해시태그 ======
const CHUNGNAM_REGION_NAMES = [
  '천안시',
  '아산시',
  '공주시',
  '보령시',
  '서산시',
  '논산시',
  '당진시',
  '계룡시',
  '금산군',
  '부여군',
  '서천군',
  '청양군',
  '홍성군',
  '예산군',
  '태안군',
];

const PREFERRED_HASHTAGS = [
  '혼자여행',
  '커플여행',
  '가족여행',
  '우정여행',
  '여행버디',
  '즉흥여행',
  '계획여행',
  '자연여행',
  '도시탐방',
  '문화유산',
  '힐링여행',
  '액티비티',
  '맛집투어',
  '야경명소',
  '해수욕장',
  '산정상뷰',
  '계곡여행',
  '한옥마을',
  '전통시장',
  '한강산책',
  '감성숙소',
  '가성비숙소',
  '한적한여행',
  '혼산',
  '혼캠',
  '감성사진',
  '카페투어',
  '야경촬영',
  '자연과함께',
  '힐링산책',
  '산림욕',
  '한적한바닷가',
  '로컬푸드',
  '재충전',
  '계획없이떠나기',
  '사진맛집',
  '편한여행',
  '감성여행',
  '조용한여행',
  '감성가득',
  '쉼표여행',
  '마음정리',
  '트레킹',
  '일상탈출',
  '소확행',
  '걷기좋은길',
  '하늘풍경',
  '초록자연',
  '일몰명소',
  '바람쐬기',
];

// ====== 추천 리스트 정렬 옵션/엔드포인트 ======
const API_BASE_URL = 'http://124.60.137.10:8083'; // ← 서버 주소
const SORT_OPTION = 'wishlistDesc'; // addedAsc|addedDesc|priceAsc|priceDesc|reviewDesc|wishlistDesc

// ====== 카드 그리드 레이아웃 상수 ======
const H_PADDING = 16;
const GUTTER = 12;
const CARD_W = (width - H_PADDING * 2 - GUTTER) / 2;
const CARD_H = 220;
const DOT_SPACING = 24; // 도트 간격

type TourProgramCard = {
  id: number;
  title: string;
  region: string;
  likes?: number;
  wishlistCount?: number;
  thumbnailUrl?: string | null;
};

const MainHomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const {t, i18n} = useTranslation();

  // --- 슬라이드 상태 ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useRef(new Animated.Value(width)).current;
  const dotPosition = useRef(new Animated.Value(0)).current;
  const animationTimer = useRef<NodeJS.Timeout | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // --- 추천 투어 상태 (API) ---
  const [topTours, setTopTours] = useState<TourProgramCard[]>([]);
  const [loadingTop, setLoadingTop] = useState(false);
  const [errorTop, setErrorTop] = useState<string | null>(null);

  // ---------- 도트 애니메이션 ----------
  useEffect(() => {
    Animated.spring(dotPosition, {
      toValue: currentIndex,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [currentIndex]);

  // ---------- 슬라이드 애니메이션 ----------
  const startSlideAnimation = useCallback(() => {
    if (animationTimer.current) {
      clearTimeout(animationTimer.current);
    }

    translateX.setValue(width);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 700,
      useNativeDriver: true,
    }).start(() => {
      animationTimer.current = setTimeout(() => {
        Animated.timing(translateX, {
          toValue: -width,
          duration: 700,
          useNativeDriver: true,
        }).start(() => {
          setCurrentIndex(prev => (prev + 1) % CHUNGNAM_SPOTS.length);
          startSlideAnimation();
        });
      }, 5000);
    });
  }, [translateX]);

  useEffect(() => {
    startSlideAnimation();
    return () => {
      if (animationTimer.current) {
        clearTimeout(animationTimer.current);
      }
    };
  }, [startSlideAnimation]);

  // ---------- 추천(위시리스트 내림차순) API ----------
  const fetchTopTours = useCallback(async () => {
    // axios가 배열을 a=1&a=2 형태로 보내도록
    const paramsSerializer = (params: Record<string, any>) => {
      const esc = encodeURIComponent;
      const parts: string[] = [];
      Object.keys(params).forEach(k => {
        const v = params[k];
        if (Array.isArray(v)) {
          v.forEach(item => parts.push(`${esc(k)}=${esc(String(item))}`));
        } else if (v !== undefined && v !== null) {
          parts.push(`${esc(k)}=${esc(String(v))}`);
        }
      });
      return parts.join('&');
    };

    try {
      setLoadingTop(true);
      setErrorTop(null);

      const token = await AsyncStorage.getItem('accessToken');

      // ✅ 모든 프로그램 조회 (페이지네이션 없이)
      const params = {
        hashtags: PREFERRED_HASHTAGS, // 배열 → 중복 키
        regions: CHUNGNAM_REGION_NAMES, // 배열 → 중복 키
        page: 0,
        size: 100, // 충분히 큰 수로 설정하여 모든 데이터 조회
      };

      const res = await axios.get(`${API_BASE_URL}/api/tour-program`, {
        params,
        paramsSerializer,
        headers: token ? {Authorization: `Bearer ${token}`} : undefined,
      });

      const raw = res.data?.data?.content ?? res.data?.data ?? res.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const mapped: TourProgramCard[] = list.map((item: any) => ({
        id: item.id ?? item.tourProgramId,
        title: item.title,
        region: item.region ?? item.regionName ?? '',
        likes: item.likes ?? item.likeCount,
        wishlistCount:
          item.wishlistCount ?? item.favorites ?? item.bookmarkCount ?? 0,
        thumbnailUrl: item.thumbnailUrl ?? item.imageUrl ?? null,
      }));

      // console.log('🟢 모든 프로그램 데이터:', mapped);

      // 각 프로그램의 상세 정보를 가져와서 wishlistCount 업데이트
      const updatedPrograms = await Promise.all(
        mapped.map(async (program) => {
          try {
            const cleanToken = token?.replace('Bearer ', '') || '';
            
            const detailResponse = await axios.get(
              `${API_BASE_URL}/api/tour-program/${program.id}`,
              {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${cleanToken}`,
                },
                timeout: 5000,
              }
            );
            
            if (detailResponse.data && detailResponse.data.data) {
              return {
                ...program,
                wishlistCount: detailResponse.data.data.wishlistCount || 0,
              };
            }
            return program;
          } catch (error) {
            console.log(`❌ 프로그램 ${program.id} 상세 정보 가져오기 실패:`, error);
            return program;
          }
        })
      );

      // console.log('🟢 wishlistCount 업데이트된 프로그램들:', updatedPrograms);

      // wishlistCount 기준으로 내림차순 정렬
      const sortedTours = updatedPrograms.sort((a, b) => (b.wishlistCount || 0) - (a.wishlistCount || 0));
      
      console.log('🟢 정렬된 프로그램들:', sortedTours);
      
      // 상위 5개만 선택
      setTopTours(sortedTours.slice(0, 4));
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        '추천 목록을 불러오지 못했습니다.';
      setErrorTop(msg);
      console.log('[fetchTopTours] error:', e?.response?.data ?? e);
    } finally {
      setLoadingTop(false);
    }
  }, []);

  useEffect(() => {
    fetchTopTours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 링크 열기(정규화 + 바로 openURL) ----------
  const normalizeUrl = (raw: string) => {
    if (!raw) {
      return '';
    }
    let url = raw.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    try {
      url = encodeURI(url);
    } catch {}
    return url;
  };

  const openSpotLink = async (rawUrl: string) => {
    const url = normalizeUrl(rawUrl);
    if (!url) {
      Alert.alert('링크를 열 수 없어요', 'URL이 비어있습니다.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.warn('openURL failed:', err, url);
      Alert.alert(
        '링크를 열 수 없어요',
        '네트워크/브라우저/URL 형식을 확인해주세요.',
      );
    }
  };

  // ---------- 도트 ----------
  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {CHUNGNAM_SPOTS.map((_, idx) => (
        <TouchableOpacity
          key={idx}
          onPress={() => setCurrentIndex(idx)}
          style={[
            styles.dot,
            {backgroundColor: idx === currentIndex ? '#90EE90' : '#D9D9D9'},
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${idx + 1}번째 슬라이드로 이동`}
        />
      ))}
      <Animated.View
        style={[
          styles.activeDot,
          {
            transform: [
              {translateX: Animated.multiply(dotPosition, DOT_SPACING)},
            ],
          },
        ]}
      />
    </View>
  );

  // ---------- 추천 카드(2열) ----------
  const renderTourCard = ({
    item,
    index,
  }: {
    item: TourProgramCard;
    index: number;
  }) => {
    const isLeft = index % 2 === 0;
    const wishOrLike = item.wishlistCount ?? item.likes ?? '-';
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.tourCard,
          {
            marginLeft: isLeft ? H_PADDING : GUTTER / 2,
            marginRight: isLeft ? GUTTER / 2 : H_PADDING,
          },
        ]}
        onPress={() => navigation.navigate('PracticeDetail', { tourProgramId: item.id })}
      >
        <View style={styles.tourThumbWrap}>
          {item.thumbnailUrl ? (
            <Image source={{uri: item.thumbnailUrl}} style={styles.tourThumb} />
          ) : (
            <View style={[styles.tourThumb, styles.tourThumbPlaceholder]}>
              <Ionicons name="image-outline" size={28} />
              <Text style={styles.tourThumbPhText}>No Image</Text>
            </View>
          )}
        </View>
        <View style={styles.tourInfo}>
          <Text style={styles.tourTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.tourMetaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="location-outline" size={14} color="#228B22" />
              <Text style={styles.metaPillText}>{item.region}</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="heart" size={14} color="#e53935" />
              <Text style={styles.metaPillText}>{wishOrLike}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ---------- 네비게이션 핸들러 ----------
  const handleTest = () => navigation.navigate('QuestionScreen');
  const handleTraitSelection = () => navigation.navigate('TraitSelection');
  const handleCalendar = () => navigation.navigate('CalendarHome');

  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setShowLanguageModal(false);
  };

  const languages = [
    {code: 'ko', name: t('korean'), flag: '🇰🇷'},
    {code: 'en', name: t('english'), flag: '🇺🇸'},
    {code: 'ja', name: t('japanese'), flag: '🇯🇵'},
    {code: 'zh', name: t('chinese'), flag: '🇨🇳'},
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 언어 선택 버튼 */}
      <View style={styles.languageButtonContainer}>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setShowLanguageModal(true)}>
          <Ionicons name="language" size={20} color="#228B22" />
          <Text style={styles.languageButtonText}>{t('language')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 🔥 충남 관광지 슬라이드 */}
        <View style={{alignItems: 'center', marginTop: 24, marginBottom: 10}}>
          <Text style={styles.sectionTitle}>충남 인기 관광지</Text>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openSpotLink(CHUNGNAM_SPOTS[currentIndex].url)}
            style={{width: width * 0.9}}>
            <Animated.View
              style={{
                transform: [{translateX}],
                width: width * 0.9,
                height: 220,
                borderRadius: 16,
                overflow: 'hidden',
              }}>
              <Image
                source={{uri: CHUNGNAM_SPOTS[currentIndex].imageUrl}}
                style={{width: '100%', height: '100%'}}
                resizeMode="cover"
              />
            </Animated.View>
          </TouchableOpacity>

          <Text style={styles.slideCaption} numberOfLines={1}>
            {CHUNGNAM_SPOTS[currentIndex].title}
          </Text>

          {renderDots()}
        </View>

        {/* 버튼형 카드들 */}
        <View style={styles.actionGrid}>
          {[
            {
              icon: '🧠',
              label: t('personalityTest'),
              action: handleTest,
              bg: '#E3F2FD',
            },
            {
              icon: '📍',
              label: t('myTourism'),
              action: handleTraitSelection,
              bg: '#C8E6C9',
            },
            {
              icon: '📅',
              label: t('calendar'),
              action: handleCalendar,
              bg: '#FFE0B2',
            },
            {
              icon: '🔎',
              label: '스타일별 관광 탐색',
              action: () => navigation.navigate('TraitSelection1'),
              bg: '#FFF9C4',
            },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.iconCard, {backgroundColor: item.bg}]}
              onPress={item.action}>
              <Text style={styles.iconEmoji}>{item.icon}</Text>
              <Text style={styles.iconLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* ▶ 추천수(위시리스트) 상위 투어 (2열 그리드) */}
        <View style={{marginTop: 28}}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('추천수 상위 투어') || '추천수 상위 투어'}
            </Text>
            <TouchableOpacity onPress={fetchTopTours}>
              <Ionicons name="refresh" size={18} color="#228B22" />
            </TouchableOpacity>
          </View>

          {loadingTop ? (
            <ActivityIndicator style={{marginTop: 12}} />
          ) : errorTop ? (
            <Text style={styles.errorText}>{errorTop}</Text>
          ) : (
            <FlatList
              data={topTours}
              keyExtractor={it => String(it.id)}
              renderItem={renderTourCard}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={{marginBottom: 12}}
              ListEmptyComponent={
                <Text style={{marginLeft: 16, color: '#607D8B'}}>
                  표시할 투어가 없어요.
                </Text>
              }
              ListFooterComponent={<View style={{height: 4}} />}
            />
          )}
        </View>
      </ScrollView>

      {/* 언어 선택 모달 */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('language')}</Text>
            {languages.map(language => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageOption,
                  i18n.language === language.code && styles.selectedLanguage,
                ]}
                onPress={() => changeLanguage(language.code)}>
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <Text style={styles.languageName}>{language.name}</Text>
                {i18n.language === language.code && (
                  <Ionicons name="checkmark" size={20} color="#228B22" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLanguageModal(false)}>
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'white'},
  scrollContent: {paddingBottom: 60},

  sectionTitle: {fontSize: 18, fontWeight: 'bold', marginBottom: 10},
  sectionHeader: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // 슬라이드 캡션
  slideCaption: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
    maxWidth: width * 0.9,
  },

  // 도트
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    height: 8,
  },
  dot: {width: 8, height: 8, borderRadius: 4, marginHorizontal: 8},
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#90EE90',
    position: 'absolute',
    left: 8,
  },

  // 액션 그리드
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    marginTop: 30,
  },
  iconCard: {
    width: width * 0.42,
    height: 100,
    borderRadius: 16,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#fff',
  },
  iconEmoji: {fontSize: 28, marginBottom: 6},
  iconLabel: {fontSize: 15, fontWeight: '600', color: '#333'},

  // 추천 카드(2열)
  errorText: {color: '#e53935', marginTop: 8, marginLeft: 16},
  tourCard: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  tourThumbWrap: {width: '100%', height: 120, backgroundColor: '#ECEFF1'},
  tourThumb: {width: '100%', height: '100%'},
  tourThumbPlaceholder: {alignItems: 'center', justifyContent: 'center'},
  tourThumbPhText: {marginTop: 4, fontSize: 12, color: '#90A4AE'},
  tourInfo: {padding: 10, flex: 1, justifyContent: 'space-between'},
  tourTitle: {fontSize: 14, fontWeight: '700', color: '#222'},
  tourMetaRow: {flexDirection: 'row', marginTop: 8, gap: 8},
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metaPillText: {fontSize: 12, color: '#228B22', fontWeight: '600'},

  // 팁/이벤트
  tipBox: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: '#e1f5fe',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'column',
    gap: 4,
  },
  tipTitle: {fontSize: 16, fontWeight: 'bold', color: '#228B22'},
  tipSub: {fontSize: 15, color: '#37474f'},
  eventBox: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 6,
  },
  eventDescription: {fontSize: 14, color: '#4E342E', lineHeight: 20},

  // 언어 버튼/모달
  languageButtonContainer: {
    position: 'absolute',
    top: 10,
    right: 20,
    zIndex: 1,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  languageButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#228B22',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: width * 0.8,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedLanguage: {backgroundColor: '#e3f2fd'},
  languageFlag: {fontSize: 24, marginRight: 12},
  languageName: {flex: 1, fontSize: 16, color: '#333'},
  closeButton: {
    marginTop: 20,
    backgroundColor: '#90EE90',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {color: 'white', fontSize: 16, fontWeight: '500'},
});

export default MainHomeScreen;

