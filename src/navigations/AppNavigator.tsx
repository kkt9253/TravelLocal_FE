import React from 'react';
import {TouchableOpacity} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import BottomTabNavigator from './BottomTabNavigator';
import AuthStackNavigator from './stack/AuthStackNavigator';
import FunctionStackNavigator from './stack/FunctionStackNavigator';
import QuestionScreen from '../screens/mbti/QuestionScreen';
import Make_program from '../screens/program/Make_program';
import TraitSelection from '../screens/Select_mbti/Trait_Selection';
import ResultScreen from '../screens/mbti/ResultScreen';
// ✅ 충돌 기호 제거 및 정리된 임포트
import Practice from '../screens/practice/Program_review';
import PlaceReview from '../screens/practice/place_review';
import Practice1 from '../screens/practice/Program_detail';
import PlaceDetailScreen from '../screens/practice/PlaceDetailScreen';
import MyReviewList from '../screens/mypage/MyReviewList';
import MyPage from '../screens/mypage/MyPage';
import PaymentScreen from '../screens/payment/PaymentScreen';
import PaymentCompleteScreen from '../screens/payment/PaymentCompleteScreen';
import WishlistScreen from '../screens/wishlist/WishlistScreen';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import ChatMain from '../screens/chat/ChatMain';
import ChatRoom from '../screens/chat/ChatRoom';
import TranslatorScreen from '../screens/function/TranslatorScreen';
import TranslatorHistoryScreen from '../screens/function/TranslatorHistoryScreen';
import {useTranslation} from 'react-i18next';
import TraitSelection1 from '../screens/Select_mbti/mystyle';
import SplashScreen from '../screens/SplashScreen';

export type AppStackParamList = {
  Splash: undefined;
  AuthStack: undefined;
  Main: undefined;
  FunctionStack: {
    screen: 'Test' | 'TourByPreference' | 'TourByRegion' | 'TodayRecommend' | 'Translator' | 'TranslatorHistory';
  };
  QuestionScreen: undefined;
  MyPage: undefined;
  Make_program: {
    editData?: {
      title: string;
      description: string;
      guidePrice: number;
      region: string;
      thumbnailUrl: string;
      hashtags: string[];
      schedules: Array<{
        day: number;
        scheduleSequence: number;
        placeName: string;
        lat: number;
        lon: number;
        placeDescription: string;
        travelTime: number;
      }>;
    };
    tourProgramId?: string;
    isEdit?: boolean;
  };
  TraitSelection: undefined;
  Result: {
    result: any;
  };
  Practice: { tourProgramId?: number; placeId?: string };
  PlaceReview: { placeId: string; placeName?: string };
  PracticeDetail: {tourProgramId: number; refresh?: boolean; selectedLanguage?: string};
  PlaceDetail: {placeName: string; placeDescription: string; lat: number; lon: number; placeId?: string; language?: string; tourProgramId?: number};
  // ✅ 중복 제거된 IamportPayment 타입
  IamportPayment: {
    userCode: string;
    data: {
      pg: string;
      pay_method: string;
      name: string;
      amount: number;
      merchant_uid: string;
      buyer_name: string;
      buyer_tel: string;
      buyer_email: string;
    };
  };
  CalendarHome: undefined;
  ChatMain: undefined;
  ChatRoom: {roomId: string; userId?: number};
  MyReviewList: undefined;
  PaymentScreen: {
    tourData?: any;
    tourProgramId?: number;
    unlockSchedule?: boolean;
  };
  PaymentComplete: undefined;
  WishlistScreen: undefined;
  Translator: undefined;
  TranslatorHistory: undefined;
  TraitSelection1: undefined;
};

export type AppStackScreenProps<T extends keyof AppStackParamList> =
  NativeStackScreenProps<AppStackParamList, T>;

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppNavigator = () => {
  const {t} = useTranslation();

  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen
        name="AuthStack"
        children={({navigation}) => (
          <AuthStackNavigator
            navigationOverride={() =>
              navigation.reset({
                index: 0,
                routes: [{name: 'Main'}],
              })
            }
          />
        )}
      />
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      <Stack.Screen name="FunctionStack" component={FunctionStackNavigator} />
      <Stack.Screen
        name="QuestionScreen"
        component={QuestionScreen}
        options={{
          headerShown: true,
          title: t('mbtiTest'),
          headerTitleStyle: {
            fontSize: 20,
          },
        }}
      />
      <Stack.Screen
        name="PracticeDetail"
        component={Practice1}
        options={{
          headerShown: true,
          title: t('practiceDetail'),
          headerTitleStyle: {fontSize: 20},
        }}
      />
      <Stack.Screen
        name="TraitSelection"
        component={TraitSelection}
        options={{
          headerShown: true,
          title: t('traitSelection'),
          headerTitleStyle: {
            fontSize: 20,
          },
        }}
      />
      <Stack.Screen
        name="Result"
        component={ResultScreen}
        options={{
          headerShown: true,
          title: t('mbtiResult'),
          headerTitleStyle: {
            fontSize: 20,
          },
        }}
      />
      <Stack.Screen
        name="Practice"
        component={Practice}
        options={{
          headerShown: true,
          title: t('myReview'),
          headerTitleStyle: {
            fontSize: 20,
          },
        }}
      />
      <Stack.Screen
        name="PlaceReview"
        component={PlaceReview}
        options={{
          headerShown: true,
          title: '장소 리뷰',
          headerTitleStyle: {
            fontSize: 20,
          },
        }}
      />
      <Stack.Screen
        name="Make_program"
        component={Make_program}
        options={{
          headerShown: true,
          title: '프로그램 작성하기',
          headerTitleStyle: {
            fontSize: 20,
          },
        }}
      />
      <Stack.Screen
        name="MyReviewList"
        component={MyReviewList}
        options={{
          headerShown: true,
          title: t('myReviewList'),
          headerTitleStyle: {fontSize: 20},
        }}
      />
      <Stack.Screen
        name="PaymentScreen"
        component={PaymentScreen}
        options={{
          headerShown: true,
          title: t('payment'),
          headerTitleStyle: {fontSize: 20},
        }}
      />
      <Stack.Screen
        name="PaymentComplete"
        component={PaymentCompleteScreen}
        options={{
          headerShown: true,
          title: t('paymentComplete'),
          headerTitleStyle: {fontSize: 20},
        }}
      />
      <Stack.Screen
        name="WishlistScreen"
        component={WishlistScreen}
        options={{
          headerShown: true,
          title: t('wishlistScreen'),
          headerTitleStyle: {fontSize: 20},
        }}
      />
      <Stack.Screen
        name="CalendarHome"
        component={CalendarScreen}
        options={{
          headerShown: true,
          title: t('calendarScreen'),
          headerTitleStyle: {fontSize: 20},
        }}
      />
      <Stack.Screen
        name="ChatMain"
        component={ChatMain}
        options={{
          headerShown: true,
          title: t('chatMain'),
          headerTitleStyle: {fontSize: 20},
        }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoom}
        options={({navigation}) => ({
          headerShown: true,
          title: t('chatRoom'),
          headerTitleStyle: {fontSize: 20},
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('ChatMain')}
              style={{marginLeft: 10}}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="MyPage"
        component={MyPage}
        options={{
          headerShown: true,
          title: t('mypage'),
          headerTitleStyle: {fontSize: 20},
        }}
      />
      <Stack.Screen
        name="Translator"
        component={TranslatorScreen}
        options={{
          headerShown: true,
          title: '실시간 번역기',
          headerTitleStyle: {fontSize: 20},
        }}
      />
      <Stack.Screen
        name="TranslatorHistory"
        component={TranslatorHistoryScreen}
        options={{
          headerShown: true,
          title: '번역 히스토리',
          headerTitleStyle: {fontSize: 20},
        }}
      />
      <Stack.Screen
        name="PlaceDetail"
        component={PlaceDetailScreen}
        options={{
          headerShown: true,
          title: t('placeDetail'),
          headerTitleStyle: {fontSize: 20},
        }}
      />
      <Stack.Screen name="TraitSelection1" component={TraitSelection1} />
    </Stack.Navigator>
  );
};

export default AppNavigator;