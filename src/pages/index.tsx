import { SignInButton, useUser } from "@clerk/nextjs";
import { type NextPage } from "next";

import { api } from "~/utils/api";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Image from "next/image";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { toast } from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { PostView } from "~/components/postview";
import { type SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

dayjs.extend(relativeTime);

type FormDataType = {
  content: string;
};

const schema = z.object({
  content: z.string().emoji().nonempty().min(1).max(280),
});

const CreatePostWizard = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, dirtyFields, isValid },
  } = useForm<FormDataType>({
    resolver: zodResolver(schema),
  });

  const { user } = useUser();

  const ctx = api.useContext();

  const { mutate, isLoading: isPosting } = api.posts.create.useMutation({
    onSuccess: () => {
      void ctx.posts.getAll.invalidate();
      reset();
    },
    onError: (e) => {
      const errorMessage = e.data?.zodError?.fieldErrors.content;

      if (errorMessage && errorMessage[0]) {
        toast.error(errorMessage[0]);
      } else {
        toast.error("Failed to post! Please try again later.");
      }
    },
  });

  if (!user) return null;

  const onSubmit: SubmitHandler<FormDataType> = (formData) => {
    mutate({ content: formData.content });
  };

  return (
    <div className="flex w-full gap-3">
      <Image
        src={user.profileImageUrl}
        alt="Profile Image"
        className="h-14 w-14 rounded-full"
        width={56}
        height={56}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="flex w-full gap-3">
        <div className="relative flex w-full items-center">
          <input
            type="text"
            placeholder="Type some emojis"
            className="grow bg-transparent outline-none"
            {...register("content", {
              disabled: isPosting,
            })}
          />
          {errors.content ? (
            <span className="absolute -bottom-2 text-sm text-red-400">
              {errors.content.message}
            </span>
          ) : null}
        </div>

        {(dirtyFields.content || isValid) && !isPosting && (
          <button type="submit">Post</button>
        )}

        {isPosting && (
          <div className="flex items-center justify-center">
            <LoadingSpinner size={20} />
          </div>
        )}
      </form>
    </div>
  );
};

const Feed = () => {
  const { data, isLoading: postsLoading } = api.posts.getAll.useQuery();

  if (postsLoading) return <LoadingPage />;

  if (!data) return <div>Something went wrong</div>;

  return (
    <div className="flex flex-col">
      {data.map((fullPost) => (
        <PostView {...fullPost} key={fullPost.post.id} />
      ))}
    </div>
  );
};

const Home: NextPage = () => {
  const { isLoaded: userLoaded, isSignedIn } = useUser();

  // Start fetching asap
  api.posts.getAll.useQuery();

  // Return empty div if user isn't loaded yet
  if (!userLoaded) return <div />;

  return (
    <PageLayout>
      <div className="flex border-b border-b-slate-400 p-4">
        {!isSignedIn && (
          <div className="flex justify-center">
            <SignInButton />
          </div>
        )}
        {isSignedIn && <CreatePostWizard />}
      </div>

      <Feed />
    </PageLayout>
  );
};

export default Home;
