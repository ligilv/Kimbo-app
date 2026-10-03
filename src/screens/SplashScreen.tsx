import LottieView from 'lottie-react-native';
import { useRef } from 'react';
import { Animated, StatusBar, StyleSheet } from 'react-native';

const BRAND_GREEN = '#1F4D3A';

type Props = {
  onFinish: () => void;
};

// ponytail: plays one 2s loop then fades out. Once there is real startup work
// (restoring cached data), keep it up until that finishes instead.
export function SplashScreen({ onFinish }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;

  const fadeOut = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(onFinish);
  };

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <StatusBar barStyle="light-content" />
      <LottieView
        source={require('../assets/lottie/kimbo_loader_dark_bg.json')}
        autoPlay
        loop={false}
        onAnimationFinish={fadeOut}
        style={styles.animation}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_GREEN,
  },
  // Sized so the ring matches the Android 12+ system splash icon it replaces.
  animation: {
    width: 194,
    height: 194,
  },
});
