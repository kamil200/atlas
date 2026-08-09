import { useGetMeQuery } from "@/store/api/auth-api";

/*
  /api/auth/me answers 401 when nobody is signed in, so an error here is the
  normal logged-out state rather than a failure worth showing.
*/
export function useCurrentUser() {
  const { data, isLoading, isError } = useGetMeQuery();
  return {
    user: data?.user,
    isAuthenticated: Boolean(data?.user) && !isError,
    isLoading,
  };
}
