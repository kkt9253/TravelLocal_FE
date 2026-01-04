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
  const placeId = route.params?.placeId;
  const placeName = route.params?.placeName;
  const googlePlaceId = placeId;

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRating, setNewRating] = useState(5);
  const [newContent, setNewContent] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'latest' | 'rating' | 'lowRating'>('latest');

  const sortMap = React.useMemo(() => ({
    latest: 'addedDesc',
    rating: 'ratingDesc',
    lowRating: 'ratingAsc',
  }), []);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const savedUserName = await AsyncStorage.getItem('currentUserName');
        const savedUserId = await AsyncStorage.getItem('currentUserId');
        if (savedUserName && savedUserId) {
          setCurrentUserName(savedUserName);
          setCurrentUserId(savedUserId);
          return;
        }
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          const cleanToken = token.replace('Bearer ', '');
          const response = await axios.get('http://124.60.137.10:8083/api/user', {
            headers: { Authorization: `Bearer ${cleanToken}` },
          });
          if (response.data.status === 'OK') {
            const userData = response.data.data;
            const userName = userData.name || userData.username;
            setCurrentUserName(userName);
            setCurrentUserId(userData.id.toString());
            await AsyncStorage.setItem('currentUserName', userName);
            await AsyncStorage.setItem('currentUserId', userData.id.toString());
          }
        }
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
      }
    };
    getCurrentUser();
  }, []);

  const fetchReviews = async () => {
    if (!placeId) return;
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      const cleanToken = token ? token.replace('Bearer ', '') : null;
      const res = await axios.get(`http://124.60.137.10:8083/api/place/review/${googlePlaceId}`, {
        params: { page: 0, size: 10, sortOption: sortMap[sortOrder] },
        headers: cleanToken ? { Authorization: `Bearer ${cleanToken}` } : undefined,
      });
      if (res.data.status === 'OK' || res.data.status === 'Success') {
        const processed = res.data.data.map((review: any, index: number) => ({
          ...review,
          id: review.reviewId || index + 1000,
          imageUrls: Array.isArray(review.imagesUrls) ? review.imagesUrls : [],
          rating: Math.min(Math.max(review.rating || 0, 0), 5),
          name: review.name || '익명',
          verificationBadge: review.verificationBadge || false,
          createdAt: review.createdAt || new Date().toISOString(),
        }));
        setReviews(processed);
      }
    } catch (error) {
      console.error('리뷰 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [sortOrder, placeId]);

  const handleSubmit = async () => {
    if (!newContent.trim()) return Alert.alert('알림', '내용을 입력해주세요.');
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) return Alert.alert('알림', '로그인이 필요합니다.');
    setIsSubmitting(true);
    try {
      const requestBody = {
        googlePlaceId: placeId,
        rating: newRating.toFixed(1),
        content: newContent,
        imageUrls: newImageUrl ? [newImageUrl] : [],
        userName: currentUserName || '사용자',
      };
      const response = await axios.post(`http://124.60.137.10:8083/api/place/review`, requestBody, {
        headers: { Authorization: `Bearer ${token.replace('Bearer ', '')}` },
      });
      if (response.data.status === 'OK') {
        setNewContent('');
        setNewImageUrl('');
        fetchReviews();
        Alert.alert('성공', '리뷰가 등록되었습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '등록 실패');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    Alert.alert('삭제', '리뷰를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try {
          const token = await AsyncStorage.getItem('accessToken');
          await axios.delete(`http://124.60.137.10:8083/api/place/review`, {
            params: { googlePlaceId, reviewId },
            headers: { Authorization: `Bearer ${token?.replace('Bearer ', '')}` },
          });
          fetchReviews();
        } catch (error) {
          Alert.alert('오류', '삭제 실패');
        }
      }},
    ]);
  };

  const calculateRatingStats = (reviews: any[]) => {
    if (reviews.length === 0) return {average: 0, distribution: []};
    const distribution = Array(5).fill(0).map((_, i) => ({ score: 5 - i, count: 0 }));
    let totalRating = 0;
    reviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[5 - Math.floor(r.rating)].count++;
        totalRating += r.rating;
      }
    });
    return { average: totalRating / reviews.length, distribution };
  };

  if (loading) return <ActivityIndicator size="large" style={{marginTop: 50}} color="#1976d2" />;

  const {average, distribution} = calculateRatingStats(reviews);

  return (
    <ScrollView style={styles.mainContainer}>
      <View style={styles.tourHeader}>
        <Text style={styles.tourTitle}>{placeName || '장소 리뷰'}</Text>
        <Text style={styles.reviewCount}>전체 리뷰 {reviews.length}개</Text>
      </View>

      <View style={styles.writeBox}>
        <Text style={styles.writeTitle}>리뷰 작성</Text>
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

      <View style={styles.ratingSummary}>
        <View style={{alignItems: 'center', marginRight: 24}}>
          <Text style={styles.bigScore}>{average.toFixed(1)}</Text>
          <Text style={styles.stars_text}>{renderStars(average)}</Text>
        </View>
        <View style={{flex: 1}}>
          {distribution.map(r => (
            <View key={r.score} style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>{r.score}점</Text>
              <View style={styles.barBackground}>
                <View style={[styles.barFill, {width: reviews.length > 0 ? `${(r.count / reviews.length) * 100}%` : '0%'}]} />
              </View>
              <Text style={styles.countText}>{r.count}</Text>
            </View>
          ))}
        </View>
      </View>

      {reviews.map((review, i) => (
        <View key={review.id || i} style={styles.reviewCard}>
          <View style={styles.profileRow}>
            <View style={{flex: 1}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={styles.nickname}>{review.name}</Text>
                {review.verificationBadge && <Text style={styles.badge}>☑️</Text>}
              </View>
              <Text style={styles.stars_display}>{renderStars(review.rating)}</Text>
            </View>
            {(review.userId?.toString() === currentUserId || review.user_id?.toString() === currentUserId) && (
              <TouchableOpacity onPress={() => handleDeleteReview(review.reviewId)}>
                <Text style={{color: 'red', fontWeight: 'bold'}}>삭제</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.content}>{review.content}</Text>
          <Text style={styles.date}>{new Date(review.createdAt).toLocaleDateString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {flex: 1, backgroundColor: '#fff'},
  tourHeader: {padding: 20, borderBottomWidth: 1, borderColor: '#eee'},
  tourTitle: {fontSize: 20, fontWeight: 'bold', color: '#000'},
  reviewCount: {fontSize: 14, color: '#666', marginTop: 5},
  writeBox: {padding: 20, backgroundColor: '#f9f9f9', margin: 15, borderRadius: 10},
  writeTitle: {fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#000'},
  starRow: {flexDirection: 'row', marginBottom: 10},
  input: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, height: 80, textAlignVertical: 'top', color: '#000'},
  submitBtn: {backgroundColor: '#1976d2', padding: 12, borderRadius: 8, marginTop: 10, alignItems: 'center'},
  submitBtnText: {color: '#fff', fontWeight: 'bold'},
  ratingSummary: {flexDirection: 'row', padding: 20, borderBottomWidth: 1, borderColor: '#eee'},
  bigScore: {fontSize: 48, fontWeight: '800', color: '#000'},
  stars_text: {fontSize: 18, color: '#FFA500', marginTop: 4},
  scoreRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 4},
  scoreLabel: {width: 30, fontSize: 12, color: '#000'},
  barBackground: {height: 6, flex: 1, backgroundColor: '#eee', borderRadius: 3, marginHorizontal: 8},
  barFill: {height: 6, backgroundColor: '#FFD700', borderRadius: 3},
  countText: {width: 20, fontSize: 12, color: '#000', textAlign: 'right'},
  reviewCard: {padding: 20, borderBottomWidth: 1, borderColor: '#eee'},
  profileRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  nickname: {fontWeight: 'bold', fontSize: 15, color: '#000'},
  badge: {marginLeft: 4, fontSize: 14},
  stars_display: {color: '#FFD700', marginTop: 2, fontSize: 14},
  content: {fontSize: 14, color: '#333', marginTop: 10, lineHeight: 20},
  date: {fontSize: 12, color: '#999', marginTop: 10}
});