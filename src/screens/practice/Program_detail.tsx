import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RouteProp} from '@react-navigation/native';
import type {AppStackParamList} from '../../navigations/AppNavigator';
import axios from 'axios';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import haversine from 'haversine-distance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {translateText, supportedLanguages} from '../../api/translator';

const dayColors = ['#0288d1', '#43a047', '#fbc02d', '#e64a19', '#8e24aa'];

type Schedule = {
  day: number;
  lat: number;
  lon: number;
  placeName: string;
  placeDescription: string;
  travelTime: number;
  placeId: string;
  googlePlaceId?: string;
};

type TourData = {
  id: number;
  title: string;
  region: string;
  thumbnailUrl: string;
  reviewCount: number;
  wishlistCount: number;
  hashtags: string[];
  schedules: Schedule[];
  user: {id: number; name: string};
  description: string;
  guidePrice: number;
  tourProgramId: number;
  wishlisted: boolean;
  pointPaid: boolean;
};

const Program_detail = () => {
  const {t} = useTranslation();
  const [data, setData] = useState<TourData | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, 'PracticeDetail'>>();
  const tourProgramId = route.params?.tourProgramId ?? 1;
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // 번역 관련 state
  const [selectedLanguage, setSelectedLanguage] = useState('ko');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [translatedData, setTranslatedData] = useState<TourData | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);

  // 일정 해제 관련 state
  const [isScheduleMasked, setIsScheduleMasked] = useState(true);
  const [scheduleUnlocked, setScheduleUnlocked] = useState(false);
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [scheduleUnlockCost] = useState(100);

  // 현재 사용자 ID 가져오기
  useEffect(() => {
    const getCurrentUserId = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          const cleanToken = token.replace('Bearer ', '');
          const jwtPayload = decodeJWT(cleanToken);
          if (jwtPayload?.sub) {
            setCurrentUserId(parseInt(jwtPayload.sub));
          }
        }
      } catch (error) {
        console.error('❌ 사용자 ID 가져오기 실패:', error);
      }
    };
    getCurrentUserId();
  }, []);

  // 일정 해제 상태 확인 (서버 & 로컬)
  const checkScheduleUnlockStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return false;

      const cleanToken = token.replace('Bearer ', '');
      const response = await axios.get(
        `http://124.60.137.10:8083/api/tour-program/${tourProgramId}/unlock-status`,
        {
          headers: { Authorization: `Bearer ${cleanToken}` },
        },
      );

      if (response.data.status === 'OK') {
        const isUnlocked = response.data.data?.unlocked || false;
        await AsyncStorage.setItem(`schedule_unlocked_${tourProgramId}`, isUnlocked.toString());
        return isUnlocked;
      }
      return false;
    } catch (error) {
      const localStatus = await AsyncStorage.getItem(`schedule_unlocked_${tourProgramId}`);
      return localStatus === 'true';
    }
  };

  useEffect(() => {
    const fetchTourData = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) {
          Alert.alert('알림', '로그인이 필요합니다.');
          navigation.goBack();
          return;
        }

        const cleanToken = token.replace('Bearer ', '');
        const [tourResponse, isUnlocked] = await Promise.all([
          axios.get(`http://124.60.137.10:8083/api/tour-program/${tourProgramId}`, {
            headers: { Authorization: `Bearer ${cleanToken}` },
            timeout: 10000,
          }),
          checkScheduleUnlockStatus(),
        ]);

        if (tourResponse.data.status === 'OK' || tourResponse.data.status === '100 CONTINUE') {
          const tourData = tourResponse.data.data;
          setData(tourData);
          setIsLiked(tourData.wishlisted || false);

          const isPointPaid = tourData.pointPaid || isUnlocked || false;
          setScheduleUnlocked(isPointPaid);
          setIsScheduleMasked(!isPointPaid);
        }
      } catch (error) {
        console.error('❌ 투어 정보 로딩 실패:', error);
        Alert.alert('오류', '투어 정보를 불러오는데 실패했습니다.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchTourData();
  }, [tourProgramId]);

  const decodeJWT = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch (error) {
      return null;
    }
  };

  // 포인트로 일정 해제 처리
  const handleUnlockWithPoints = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;
      const cleanToken = token.replace('Bearer ', '');

      // 1. 잔여 포인트 확인
      const balanceRes = await axios.get('http://124.60.137.10:8083/api/points/balance', {
        headers: { Authorization: `Bearer ${cleanToken}` },
      });
      const current = balanceRes?.data?.data?.balance ?? 0;

      if (current < scheduleUnlockCost) {
        Alert.alert('포인트 부족', '포인트가 부족합니다. 충전하시겠습니까?');
        return;
      }

      Alert.alert(
        '포인트 결제',
        `사용 포인트: ${scheduleUnlockCost}\n현재 잔액: ${current}`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '해제하기',
            onPress: async () => {
              try {
                // 2. 포인트 사용 API 호출
                await axios.post('http://124.60.137.10:8083/api/points/use', {
                  amount: scheduleUnlockCost,
                  actionType: 'USE',
                  actionSubject: 'CONTENT',
                  targetId: tourProgramId,
                }, {
                  headers: { Authorization: `Bearer ${cleanToken}` },
                });

                // 3. 투어 프로그램 해제 상태 업데이트 API (필요 시)
                await axios.post(`http://124.60.137.10:8083/api/tour-program/${tourProgramId}/unlock`, {
                  unlocked: true,
                }, {
                  headers: { Authorization: `Bearer ${cleanToken}` },
                });

                setScheduleUnlocked(true);
                setIsScheduleMasked(false);
                await AsyncStorage.setItem(`schedule_unlocked_${tourProgramId}`, 'true');
                Alert.alert('성공', '상세 일정이 해제되었습니다.');
              } catch (err) {
                Alert.alert('오류', '결제 처리 중 문제가 발생했습니다.');
              }
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('오류', '포인트 정보를 가져오지 못했습니다.');
    }
  };

  // ... (기타 번역, 찜하기, 채팅 로직은 기존 코드 유지) ...

  const getGroupedSchedules = () => {
    const schedules = (translatedData || data)?.schedules || [];
    return schedules.reduce((acc, cur) => {
      const key = `Day ${cur.day}`;
      acc[key] = acc[key] || [];
      acc[key].push(cur);
      return acc;
    }, {} as Record<string, Schedule[]>);
  };

  const currentGroupedSchedules = getGroupedSchedules();

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (!data) return <View style={styles.center}><Text>데이터를 찾을 수 없습니다.</Text></View>;

  return (
    <View style={{flex: 1}}>
      <SafeAreaView style={styles.container}>
        <ScrollView>
          {data.thumbnailUrl && <Image source={{uri: data.thumbnailUrl}} style={styles.thumbnail} />}

          <View style={styles.whiteBox}>
            <Text style={styles.title}>{(translatedData || data)?.title}</Text>

            <View style={styles.rightAlignRow}>
              <Text style={styles.region}>📍 {(translatedData || data)?.region}</Text>
              <Text style={styles.like}>💖 {data.wishlistCount}</Text>
            </View>

            <Text style={styles.sectionTitle}>🗓️ 일정</Text>

            {isScheduleMasked ? (
              <View style={styles.lockedScheduleContainer}>
                <View style={styles.lockedCenterBox}>
                  <Text style={styles.lockIcon}>🔒</Text>
                  <Text style={styles.lockedTitle}>상세 일정은 결제 후 확인 가능합니다</Text>
                  <TouchableOpacity style={styles.lockedPayBtn} onPress={handleUnlockWithPoints}>
                    <Text style={styles.lockedPayBtnText}>100P로 해제하기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              Object.keys(currentGroupedSchedules).map((day, i) => (
                <View key={i} style={styles.scheduleCard}>
                  <Text style={styles.dayTitle}>{day}</Text>
                  {currentGroupedSchedules[day].map((item, idx) => (
                    <TouchableOpacity key={idx} style={styles.placeBox} onPress={() => {/* 장소 상세 이동 */}}>
                      <Text style={{color: '#000'}}>{item.placeName}</Text>
                      <Icon name="chevron-right" size={20} color="#228B22" />
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            )}

            {/* 지도 및 기타 정보 영역 생략 */}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Text style={styles.price}>₩{(data.guidePrice || 0).toLocaleString()} / 인</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.chatBtn} onPress={() => {/* 채팅 */}}>
              <Text>상담하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reserveBtn} onPress={() => {/* 예약 */}}>
              <Text style={{color: '#fff'}}>예약하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  thumbnail: { width: '100%', height: 250 },
  whiteBox: { backgroundColor: 'white', margin: 16, padding: 20, borderRadius: 12 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  rightAlignRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  region: { color: '#666' },
  like: { color: '#FF3B30' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginVertical: 12 },
  lockedScheduleContainer: { backgroundColor: '#f9f9f9', padding: 40, borderRadius: 12, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
  lockedCenterBox: { alignItems: 'center' },
  lockIcon: { fontSize: 40, marginBottom: 10 },
  lockedTitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  lockedPayBtn: { backgroundColor: '#FF385C', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  lockedPayBtnText: { color: '#fff', fontWeight: 'bold' },
  scheduleCard: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 8, marginBottom: 10 },
  dayTitle: { fontWeight: 'bold', marginBottom: 10 },
  placeBox: { backgroundColor: '#fff', padding: 12, borderRadius: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  bottomBar: { backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 18, fontWeight: 'bold' },
  buttonGroup: { flexDirection: 'row', gap: 10 },
  chatBtn: { backgroundColor: '#eee', padding: 12, borderRadius: 8 },
  reserveBtn: { backgroundColor: '#FF385C', padding: 12, borderRadius: 8 },
});

export default Program_detail;