import { type ReactNode, useCallback, useEffect } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { colors, radius, spacing } from '@/theme';

const HIDDEN = Dimensions.get('window').height;
const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 900;

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};


export function BottomSheet({ visible, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  const offset = useSharedValue(HIDDEN);

  useEffect(() => {
    if (visible) offset.value = withTiming(0, { duration: 280 });
  }, [visible, offset]);

  // Animate out first, then tell the parent, so the sheet doesn't just vanish.
  const close = useCallback(() => {
    offset.value = withTiming(HIDDEN, { duration: 220 }, finished => {
      if (finished) scheduleOnRN(onClose);
    });
  }, [offset, onClose]);

  const drag = usePanGesture({
    onUpdate: e => {
      offset.value = Math.max(0, e.translationY);
    },
    onDeactivate: e => {
      if (e.translationY > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY) {
        offset.value = withTiming(HIDDEN, { duration: 200 }, finished => {
          if (finished) scheduleOnRN(onClose);
        });
      } else {
        offset.value = withSpring(0);
      }
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [0, HIDDEN], [1, 0]),
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}
    >
      {/* Gestures inside a Modal need their own root view. */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + spacing.lg },
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={drag}>
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 43, 36, 0.45)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    maxHeight: '90%',
  },
  handleArea: { alignItems: 'center', paddingVertical: spacing.md },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(28, 43, 36, 0.25)',
  },
});
