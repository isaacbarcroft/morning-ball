import { getRootStore, type RootStore } from '@/stores/root-store';

export const useStores = (): RootStore => getRootStore();
