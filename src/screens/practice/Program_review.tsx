import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  Pressable,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import axios from 'axios';
import {useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {AppStackParamList} from '../../navigations/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTranslation} from 'react-i18next';

// JWT 토큰 디코딩 함수
const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT 디코딩 실패:', error);
    return null;
  }
};

function renderStars(rating: number) {
  const clampedRating = Math.min(Math.max(rating, 0), 5);
  const fullStars = Math.floor(clampedRating);
  const emptyStars = 5 - fullStars;
  return '⭐'.repeat(fullStars) + '☆'.repeat(emptyStars);
}

export default function ReviewScreen() {
  const {t} = useTranslation();
  const route = useRoute<RouteProp<AppStackParamList, 'Practice'>>();
  const tourProgramId = route.params?.tourProgramId;

  const [tourInfo, setTourInfo] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newRating, setNewRating] = useState(5);
  const [newContent, setNewContent] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'latest' | 'rating' | 'lowRating'>('latest');

  const sortMap = React.useMemo(() => ({
    latest: 'addedDesc',
    rating: 'ratingDesc',
    lowRating: 'ratingAsc',
  }), []);

  // 1. 초기 로드: 사용자 ID 및 투어 정보
  useEffect(() => {
    const init = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          const decoded = decodeJWT(token);
          if (decoded?.sub) setCurrentUserId(decoded.sub);
        }

        if (tourProgramId) {
          const res = await axios.get(`http://124.60.137.10:8083/api/tour-program/${tourProgramId}`);
          if (res.data.status === 'OK') setTourInfo(res.data.data);
        }
      } catch (e) {
        console.error('초기 로드 실패:', e);
      }
    };
    init();
  }, [tourProgramId]);

  // 2. 리뷰 목록 로드
  const fetchReviews = async () => {
    if (!tourProgramId) return;
    try {
      setLoading(true);
      const res = await axios.get(`http://124.60.137.10:8083/api/tour-program/review/${tourProgramId}`, {
        params: { page: 0, size: 10, sortOption: sortMap[sortOrder] }
      });
      if (res.data.status === 'OK' || res.data.status === 'Success') {
        const processed = res.data.data.map((r: any, idx: number) => ({
          ...r,
          id: r.reviewId || r.id || idx + 1000,
          user_id: r.userId || r.user_id,
          name: r.user?.name || r.name || '익명',
          rating: Number(r.rating) || 0,
        }));
        setReviews(processed);
      }
    } catch (e) {
      Alert.alert('오류', '리뷰를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [tourProgramId, sortOrder]);

  // 3. 리뷰 작성
  const handleSubmit = async () => {
    if (!newContent.trim()) return Alert.alert('알림', '내용을 입력해주세요.');
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) return Alert.alert('알림', '로그인이 필요합니다.');

    setIsSubmitting(true);
    try {
      const body = {
        tourProgramId,
        rating: newRating.toFixed(1),
        content: newContent,
        imageUrls: newImageUrl ? [newImageUrl] : [],
      };
      const res = await axios.post(`http://124.60.137.10:8083/api/tour-program/review`, body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.status === 'OK') {
        setNewContent('');
        setNewImageUrl('');
        fetchReviews();
        Alert.alert('성공', '리뷰가 등록되었습니다.');
      }
    } catch (e) {
      Alert.alert('오류', '등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. 리뷰 삭제
  const handleDelete = async (reviewId: any) => {
    Alert.alert('삭제', '정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try {
          const token = await AsyncStorage.getItem('accessToken');
          await axios.delete(`http://124.60.137.10:8083/api/tour-program/review/${tourProgramId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          fetchReviews();
          Alert.alert('성공', '삭제되었습니다.');
        } catch (e) {
          Alert.alert('오류', '삭제에 실패했습니다.');
        }
      }}
    ]);
  };

  if (loading && reviews.length === 0) return <ActivityIndicator style={{marginTop: 50}} size="large" color="#1976d2" />;

  return (
    <ScrollView style={styles.container}>
      {/* 헤더 */}
      {tourInfo && (
        <View style={styles.header}>
          <Text style={styles.tourTitle}>{tourInfo.title}</Text>
          <Text style={styles.tourRegion}>📍 {tourInfo.region}</Text>
        </View>
      )}

      {/* 입력창 */}
      <View style={styles.writeBox}>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <TouchableOpacity key={i} onPress={() => setNewRating(i)}>
              <Text style={{fontSize: 30, color: newRating >= i ? '#FFD700' : '#ccc'}}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="리뷰 내용을 입력하세요"
          placeholderTextColor="#999"
          value={newContent}
          onChangeText={setNewContent}
          multiline
        />
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
          <Text style={styles.submitBtnText}>{isSubmitting ? '등록 중...' : '리뷰 등록'}</Text>
        </TouchableOpacity>
      </View>

      {/* 정렬 */}
      <View style={styles.sortRow}>
        <Text style={styles.totalText}>리뷰 {reviews.length}개</Text>
        <Picker
          selectedValue={sortOrder}
          onValueChange={setSortOrder}
          style={{width: 150}}
        >
          <Picker.Item label="최신순" value="latest" />
          <Picker.Item label="평점높은순" value="rating" />
          <Picker.Item label="평점낮은순" value="lowRating" />
        </Picker>
      </View>

      {/* 리뷰 목록 */}
      {reviews.map((r, i) => (
        <View key={r.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View>
              <Text style={styles.nickname}>{r.name}</Text>
              <Text style={styles.stars}>{renderStars(r.rating)}</Text>
            </View>
            {/* 본인 확인 로직 (ID가 문자열/숫자일 수 있으므로 == 사용) */}
            {r.user_id == currentUserId && (
              <TouchableOpacity onPress={() => handleDelete(r.id)}>
                <Text style={styles.deleteText}>삭제</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.content}>{r.content}</Text>
          <Text style={styles.date}>{new Date(r.createdAt).toLocaleDateString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, borderBottomWidth: 1, borderColor: '#eee' },
  tourTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  tourRegion: { color: '#666', marginTop: 4 },
  writeBox: { padding: 16, backgroundColor: '#f9f9f9', margin: 16, borderRadius: 12 },
  starRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
  input: { backgroundColor: '#fff', borderWeight: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, height: 100, textAlignVertical: 'top', color: '#000' },
  submitBtn: { backgroundColor: '#1976d2', padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  sortRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  totalText: { fontWeight: 'bold', color: '#000' },
  reviewCard: { padding: 20, borderBottomWidth: 1, borderColor: '#eee' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nickname: { fontWeight: 'bold', color: '#000', fontSize: 15 },
  stars: { color: '#FFD700', marginTop: 2 },
  content: { marginTop: 10, color: '#333', lineHeight: 20 },
  date: { marginTop: 8, fontSize: 12, color: '#999' },
  deleteText: { color: '#ff4444', fontWeight: 'bold' }
});