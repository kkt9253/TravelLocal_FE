import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import {useNavigation} from '@react-navigation/native';

const backendUrl = 'http://124.60.137.10:8083';

const NaverLoginScreen = () => {
  const [isWebViewVisible, setIsWebViewVisible] = useState(false);
  const navigation = useNavigation();

const getTokenByCode = useCallback(
  async (code) => {
    try {
      // 🔍 테스트를 위해 기존 토큰 체크 주석 처리 (로그 확인용)
      /*
      const existingToken = await AsyncStorage.getItem('accessToken');
      if (existingToken) {
        setIsWebViewVisible(false);
        navigation.replace('Main');
        return;
      }
      */

      console.log('🔄 서버에 토큰 요청 시작 (code):', code);

      const response = await axios.get(
        `${backendUrl}/auth/token?code=${code}`,
        {
          withCredentials: true, // 쿠키를 받기 위해 필수
          timeout: 10000
        }
      );

      // 🔍 서버 응답 상세 로그 (Body 확인)
      console.log('📡 서버 응답 상태:', response.status);
      console.log('📦 응답 바디 데이터:', JSON.stringify(response.data, null, 2));

      // 🔍 [요구사항] 토큰 정보 상세 출력
      const authHeader = response.headers.authorization || response.headers.Authorization;
      const accessToken = authHeader?.replace('Bearer ', '');

      // 백엔드에서 set-cookie로 보낸 값 확인
      const setCookieHeader = response.headers['set-cookie'];

      console.log('================ [TOKEN DEBUG INFO] ================');
      console.log('🎫 Access Token :', accessToken ? accessToken : '없음');
      console.log('🍪 Set-Cookie 헤더 (Refresh Token 포함):', setCookieHeader);
      console.log('====================================================');

      if (accessToken) {
        await AsyncStorage.setItem('accessToken', accessToken);
        console.log('✅ Access Token 저장 완료');

        // ⚠️ 중요: 백엔드에서 보낸 쿠키(Refresh Token)가 있다면
        // 네이티브 환경에서는 별도의 쿠키 관리 라이브러리(react-native-cookies 등)를 쓰거나
        // 백엔드 응답 Body에 Refresh Token을 포함시켜서 수동으로 저장하는 것이 훨씬 편합니다.

        setIsWebViewVisible(false);
        navigation.replace('Main');
      } else {
        Alert.alert('오류', '서버 응답에 토큰이 없습니다.');
      }
    } catch (error) {
      console.error('❌ 토큰 요청 에러:', error.response?.data || error.message);
      if (error.response?.status !== 401) {
        Alert.alert('로그인 실패', '인증 서버와 통신 중 오류가 발생했습니다.');
      }
    }
  },
  [navigation]
);

//   // ✅ 코드로 accessToken 받기
//   const getTokenByCode = useCallback(
//     async (code) => {
//       try {
//         console.log('🔄 네이버 로그인 - 코드로 토큰 요청:', code);
//
//         const response = await axios.get(
//           `${backendUrl}/auth/token?code=${code}`,
//           { withCredentials: true }
//         );
//
//         console.log('📡 네이버 로그인 - 서버 응답:', response.status);
//
//         // 헤더에서 Authorization 추출
//         const authHeader = response.headers.authorization || response.headers.Authorization;
//         const accessToken = authHeader?.replace('Bearer ', '');
//
//         if (accessToken) {
//           await AsyncStorage.setItem('accessToken', accessToken);
//           console.log('✅ 네이버 로그인 - 토큰 저장 완료');
//
//           // JWT 디코딩 확인 (디버깅용)
//           try {
//             const payload = JSON.parse(atob(accessToken.split('.')[1]));
//             console.log('🔍 네이버 로그인 - JWT 페이로드:', payload);
//           } catch (e) {}
//
//           setIsWebViewVisible(false); // WebView 닫기
//           navigation.replace('Main'); // 메인 화면으로 이동
//         } else {
//           console.log('❌ 네이버 로그인 - 토큰이 없습니다');
//           Alert.alert('오류', '서버로부터 인증 토큰을 받지 못했습니다.');
//         }
//       } catch (error) {
//         console.error('❌ 토큰 요청 에러:', error);
//         Alert.alert('로그인 실패', '토큰을 받을 수 없습니다.');
//       }
//     },
//     [navigation]
//   );

  // URL에서 인가 코드(code) 추출
  const extractCodeFromUrl = (url) => {
    const queryString = url.split('?')[1];
    if (!queryString) return null;
    const params = queryString.split('&');
    for (let param of params) {
      const [key, value] = param.split('=');
      if (key === 'code') {
        return decodeURIComponent(value);
      }
    }
    return null;
  };

  // ✅ WebView의 URL 변화를 감지하여 로그인 완료 처리
  const handleWebViewNavigationStateChange = (newNavState) => {
    const { url } = newNavState;
    console.log('🌐 WebView URL 변경:', url);

    // 네이버 로그인 성공 후 백엔드에서 리다이렉트하는 URL 감지
    // 보통 앱의 스킴(travellocal://)이나 특정 성공 페이지 URL이 옵니다.
    if (url.includes('code=') && (url.includes('login/callback') || url.includes('travellocal'))) {
      const code = extractCodeFromUrl(url);
      if (code) {
        getTokenByCode(code);
      }
    }
  };

  useEffect(() => {
    // 화면 진입 시 WebView 띄움
    setIsWebViewVisible(true);

    const getInitialLink = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && initialUrl.includes('code=')) {
        const code = extractCodeFromUrl(initialUrl);
        if (code) getTokenByCode(code);
        setIsWebViewVisible(false);
      }
    };

    getInitialLink();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url && url.includes('code=')) {
        const code = extractCodeFromUrl(url);
        if (code) getTokenByCode(code);
        setIsWebViewVisible(false);
      }
    });

    return () => subscription.remove();
  }, [getTokenByCode]);

  return (
    <View style={styles.container}>
      <Modal
        visible={isWebViewVisible}
        animationType="slide"
        onRequestClose={() => setIsWebViewVisible(false)}>
        <View style={styles.webViewContainer}>
          <WebView
            source={{ uri: `${backendUrl}/oauth2/authorization/naver` }}
            style={styles.webView}
            onNavigationStateChange={handleWebViewNavigationStateChange} // URL 감지 핵심 로직
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            incognito={true} // 쿠키 캐시 방지 (로그아웃 후 재로그인 시 유용)
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webViewContainer: { flex: 1 },
  webView: { flex: 1 },
});

export default NaverLoginScreen;