import { createMMKV } from 'react-native-mmkv';

// One shared instance for the whole app (default id: mmkv.default).
export const storage = createMMKV();
