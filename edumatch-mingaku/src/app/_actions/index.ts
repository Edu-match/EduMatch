// Posts actions
export {
  getLatestPosts,
  getPopularPosts,
  getPostById,
  createPost,
  updatePost,
  getPendingPosts,
  approvePost,
  rejectPost,
  type PostWithProvider,
  type CreatePostInput,
  type CreatePostResult,
  type ContentBlock as PostContentBlock,
} from "./posts";

// Services actions
export {
  getAllServices,
  getPopularServices,
  getServiceById,
  getServicesByCategory,
  createService,
  getPendingServices,
  approveService,
  rejectService,
  type ServiceWithProvider,
  type CreateServiceInput,
  type CreateServiceResult,
  type ContentBlock as ServiceContentBlock,
} from "./services";

// Media actions
export { uploadImage, uploadMultipleImages, deleteImage } from "./media";

// View history
export {
  recordView,
  getRecentViewHistory,
  type RecentViewItem,
} from "./view-history";

// User / Profile
export {
  getCurrentUserRole,
  getCurrentUserProfile,
  getProfileById,
  getProfileWithContents,
  updateProfile,
  type UpdateProfileInput,
  type PublicProfile,
  type PublicProfileWithContents,
} from "./user";

// Material request (資料請求)
export {
  submitMaterialRequest,
  submitMaterialRequestBatch,
  getMaterialRequestById,
  type SubmitMaterialRequestInput,
  type SubmitMaterialRequestResult,
  type SubmitMaterialRequestBatchInput,
  type SubmitMaterialRequestBatchResult,
  type MaterialRequestWithService,
} from "./request-info";

// Subscription (サブスクリプション)
export {
  getCurrentSubscription,
  createCheckoutSession,
  cancelSubscription,
  updateSubscription,
  type SubscriptionInfo,
} from "./subscription";
