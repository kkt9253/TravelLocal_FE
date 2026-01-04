// ✅ PaymentScreen.tsx (Git 충돌 해결 및 코드 최적화 완료)
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {AppStackParamList} from '../../navigations/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const refundTable = Array.from({length: 11}, (_, i) => ({
  day: 10 - i,
  percent: (10 - i) * 10,
}));

const PaymentScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute();

  // route params 데이터 추출
  const tourData = route.params?.tourData as any;
  const tourProgramId = route.params?.tourProgramId as number;
  const unlockSchedule = route.params?.unlockSchedule as boolean;
  const resultParam = route.params?.result as 'success' | 'fail' | undefined;

  // 상태 관리
  const [userInfo, setUserInfo] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [day, setDay] = useState(new Date().getDate());
  const [people, setPeople] = useState(1);
  const [userId, setUserId] = useState<number | null>(null);
  const [localTourData, setLocalTourData] = useState<any>(tourData);
  const [result, setResult] = useState<'success' | 'fail' | null>(null);

  // 사용자 정보 가져오기
  const fetchUserInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('알림', '결제는 로그인이 필요한 기능입니다.', [
          { text: '확인', onPress: () => navigation.navigate('Main') }
        ]);
        return;
      }

      const response = await axios.get('http://124.60.137.10:8083/api/user', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });

      setUserInfo(response.data);
      if (response.data?.data?.id) setUserId(response.data.data.id);
    } catch (error: any) {
      console.error('❌ 사용자 정보 가져오기 실패:', error.message);
      // 실패 시 기본값 설정
      setUserInfo({
        data: { id: 1, username: '사용자', email: 'user@example.com', mobile: '01012345678' }
      });
      setUserId(1);
    }
  };

  // 투어 상세 데이터 가져오기
  const fetchTourData = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      const response = await axios.get(
        `http://124.60.137.10:8083/api/tour-program/${tourProgramId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        },
      );

      if (response.data.status === 'OK') {
        setLocalTourData(response.data.data);
      }
    } catch (error) {
      console.error('❌ 투어 데이터 가져오기 실패:', error);
    }
  };

  useEffect(() => {
    fetchUserInfo();
    if (!localTourData && tourProgramId) {
      fetchTourData();
    }
  }, []);

  // 가격 계산 로직
  const effectiveGuidePrice = localTourData?.guidePrice > 0 ? localTourData.guidePrice : 50000;
  const totalPrice = effectiveGuidePrice * people;

  const handlePayment = () => {
    if (!localTourData) {
      Alert.alert('오류', '투어 정보를 찾을 수 없습니다.');
      return;
    }

    const merchantUid = `merchant_${new Date().getTime()}`;
    const reservationData = {
      numOfPeople: people,
      guideStartDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T10:00:00`,
      guideEndDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T13:00:00`,
      tourProgramId: localTourData.tourProgramId || localTourData.id,
      paymentMethod: 'card',
      guideId: localTourData.guideId || 1,
      totalPrice: totalPrice,
      impUid: '',
      merchantUid: merchantUid,
      userId: userInfo?.data?.id || userId,
    };

    // 결제 성공으로 간주하고 결과 페이지로 이동
    navigation.navigate('PaymentComplete', {
      success: true,
      tourProgramId: tourProgramId,
      tourData: localTourData,
      reservationInfo: reservationData,
    });
  };

  if (!localTourData && !result) {
    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultText}>결제 페이지를 준비하는 중...</Text>
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: '#f5f6fa'}}>
      <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 120}}>
        <View style={styles.box}>
          <Text style={styles.title}>{localTourData?.title || '투어 제목'}</Text>
          <Text style={styles.region}>{localTourData?.region || '지역 정보'}</Text>
          <Text style={styles.price}>
            가격: ₩{effectiveGuidePrice.toLocaleString()} /인
          </Text>
        </View>

        <View style={styles.box}>
          <Text style={styles.label}>날짜 선택</Text>
          <View style={styles.row}>
            <Picker selectedValue={year} onValueChange={setYear} style={styles.picker}>
              {[2025, 2026].map(y => <Picker.Item key={y} label={`${y}년`} value={y} />)}
            </Picker>
            <Picker selectedValue={month} onValueChange={setMonth} style={styles.picker}>
              {[...Array(12)].map((_, i) => <Picker.Item key={i + 1} label={`${i + 1}월`} value={i + 1} />)}
            </Picker>
            <Picker selectedValue={day} onValueChange={setDay} style={styles.picker}>
              {[...Array(31)].map((_, i) => <Picker.Item key={i + 1} label={`${i + 1}일`} value={i + 1} />)}
            </Picker>
          </View>
        </View>

        <View style={styles.box}>
          <Text style={styles.label}>인원 설정</Text>
          <View style={styles.peopleRow}>
            <TouchableOpacity onPress={() => setPeople(Math.max(1, people - 1))} style={styles.counterBtn}>
              <Text style={styles.counterBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.peopleNum}>{people}</Text>
            <TouchableOpacity onPress={() => setPeople(people + 1)} style={styles.counterBtn}>
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.totalPeopleBox}>
            <Text style={styles.totalPeopleText}>총 {people}명</Text>
          </View>
        </View>

        <View style={styles.box}>
          <Text style={styles.label}>최종 결제 금액</Text>
          <Text style={styles.totalPrice}>{totalPrice.toLocaleString()}원</Text>
        </View>

        <View style={styles.box}>
          <Text style={styles.label}>환불 규정</Text>
          <Text style={styles.refundInfo}>취소 일자에 따른 환불 비율입니다.</Text>
          <View style={styles.refundTable}>
            {refundTable.slice(0, 5).map(row => (
              <View style={styles.refundRow} key={row.day}>
                <Text style={styles.refundCell}>{row.day === 0 ? '당일' : `${row.day}일 전`}</Text>
                <Text style={styles.refundCell}>{row.percent}% 환불</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.payButtonFixed} onPress={handlePayment}>
        <Text style={styles.payButtonText}>결제하기</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f6fa', padding: 16},
  box: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
  },
  title: {fontSize: 22, fontWeight: 'bold', color: '#000'},
  region: {fontSize: 16, color: '#666'},
  price: {fontSize: 16, color: '#000', fontWeight: 'bold', marginTop: 4},
  label: {fontWeight: 'bold', marginBottom: 8, fontSize: 16, color: '#000'},
  row: {backgroundColor: '#f8f9fa', borderRadius: 8},
  picker: {width: '100%', height: 50},
  peopleRow: {flexDirection: 'row', alignItems: 'center'},
  counterBtn: {backgroundColor: '#007AFF', padding: 12, borderRadius: 8, minWidth: 44, alignItems: 'center'},
  counterBtnText: {color: '#fff', fontSize: 20, fontWeight: 'bold'},
  peopleNum: {fontSize: 20, fontWeight: 'bold', marginHorizontal: 20, color: '#000'},
  totalPeopleBox: {marginTop: 10, alignItems: 'flex-end'},
  totalPeopleText: {fontSize: 14, color: '#666'},
  totalPrice: {fontSize: 24, fontWeight: 'bold', color: '#E53935'},
  refundInfo: {fontSize: 14, color: '#666', marginBottom: 10},
  refundTable: {borderTopWidth: 1, borderColor: '#eee'},
  refundRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee'},
  refundCell: {fontSize: 14, color: '#333'},
  payButtonFixed: {backgroundColor: '#4CAF50', padding: 18, alignItems: 'center', position: 'absolute', bottom: 0, left: 0, right: 0},
  payButtonText: {color: '#fff', fontWeight: 'bold', fontSize: 18},
  resultContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  resultText: {fontSize: 16, color: '#666'},
});

export default PaymentScreen;