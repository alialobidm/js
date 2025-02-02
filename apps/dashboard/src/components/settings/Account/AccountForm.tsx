import { cn } from "@/lib/utils";
import { type Account, useUpdateAccount } from "@3rdweb-sdk/react/hooks/useApi";
import { Flex, FormControl, Input } from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ManageBillingButton } from "components/settings/Account/Billing/ManageButton";
import { useTrack } from "hooks/analytics/useTrack";
import { useTxNotifications } from "hooks/useTxNotifications";
import { type ChangeEvent, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Button,
  type ButtonProps,
  Checkbox,
  FormErrorMessage,
  FormLabel,
  Heading,
  Text,
} from "tw-components";
import {
  type AccountValidationSchema,
  accountValidationSchema,
} from "./validations";

interface AccountFormProps {
  account: Account;
  horizontal?: boolean;
  previewEnabled?: boolean;
  showBillingButton?: boolean;
  showSubscription?: boolean;
  hideName?: boolean;
  buttonProps?: ButtonProps;
  buttonText?: string;
  padded?: boolean;
  trackingCategory?: string;
  disableUnchanged?: boolean;
  onSave?: (email: string) => void;
  onDuplicateError?: (email: string) => void;
}

export const AccountForm: React.FC<AccountFormProps> = ({
  account,
  onSave,
  onDuplicateError,
  buttonProps,
  buttonText = "Save",
  horizontal = false,
  previewEnabled = false,
  hideName = false,
  showBillingButton = false,
  showSubscription = false,
  disableUnchanged = false,
  padded = true,
}) => {
  const [isSubscribing, setIsSubscribing] = useState(
    showSubscription && !!account.email?.length,
  );
  const trackEvent = useTrack();
  const form = useForm<AccountValidationSchema>({
    resolver: zodResolver(accountValidationSchema),
    defaultValues: {
      name: account.name || "",
      email: account.unconfirmedEmail || account.email || "",
    },
    values: {
      name: account.name || "",
      email: account.unconfirmedEmail || account.email || "",
    },
  });

  const updateMutation = useUpdateAccount();

  const { onSuccess, onError } = useTxNotifications(
    "Billing account saved.",
    "Failed to save your billing account.",
  );

  const handleSubmit = form.handleSubmit((values) => {
    const formData = {
      ...values,
      ...(showSubscription
        ? {
            subscribeToUpdates: isSubscribing,
          }
        : {}),
    };

    trackEvent({
      category: "account",
      action: "update",
      label: "attempt",
      data: formData,
    });

    updateMutation.mutate(formData, {
      onSuccess: (data) => {
        if (onSave) {
          onSave(values.email);
        }
        onSuccess();

        trackEvent({
          category: "account",
          action: "update",
          label: "success",
          data,
        });
      },
      onError: (err) => {
        const error = err as Error;

        if (
          onDuplicateError &&
          error?.message.match(/email address already exists/)
        ) {
          onDuplicateError(values.email);
        } else {
          onError(error);
        }

        trackEvent({
          category: "account",
          action: "update",
          label: "error",
          error,
          fromOnboarding: !!onDuplicateError,
        });
      },
    });
  });

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={cn(
          "w-full items-start rounded-xl bg-background",
          horizontal ? "gap-6" : "gap-8",
          padded ? "border border-border p-6" : "p-0",
        )}
      >
        <Flex
          gap={horizontal ? 4 : 8}
          flexDir={horizontal ? "row" : "column"}
          w="full"
        >
          <FormControl
            isRequired
            isInvalid={!!form.getFieldState("email", form.formState).error}
          >
            <FormLabel>Email</FormLabel>

            {previewEnabled ? (
              <Flex
                borderRadius="md"
                borderColor="borderColor"
                borderWidth={1}
                h={10}
                px={3}
                alignItems="center"
              >
                <Heading size="subtitle.sm">{form.getValues("email")}</Heading>
              </Flex>
            ) : (
              <Input
                placeholder="you@company.com"
                type="email"
                {...form.register("email")}
              />
            )}

            {form.getFieldState("email", form.formState).error && (
              <FormErrorMessage size="body.sm">
                {form.getFieldState("email", form.formState).error?.message}
              </FormErrorMessage>
            )}
          </FormControl>

          {!hideName && (
            <FormControl
              isInvalid={!!form.getFieldState("name", form.formState).error}
            >
              <FormLabel>Name</FormLabel>

              {previewEnabled ? (
                <Flex
                  borderRadius="md"
                  borderColor="borderColor"
                  borderWidth={1}
                  h={10}
                  px={3}
                  alignItems="center"
                >
                  <Heading size="subtitle.sm">{form.getValues("name")}</Heading>
                </Flex>
              ) : (
                <Input
                  placeholder="Company Inc."
                  type="text"
                  {...form.register("name")}
                />
              )}

              {form.getFieldState("name", form.formState).error && (
                <FormErrorMessage size="body.sm">
                  {form.getFieldState("name", form.formState).error?.message}
                </FormErrorMessage>
              )}
            </FormControl>
          )}

          {showSubscription && (
            <Checkbox
              defaultChecked
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setIsSubscribing(e.target.checked)
              }
            >
              <Text>Subscribe to new features and key product updates</Text>
            </Checkbox>
          )}
        </Flex>

        <div
          className={cn(
            "flex w-full flex-row",
            showBillingButton ? "justify-between" : "justify-end",
          )}
        >
          {showBillingButton && <ManageBillingButton account={account} />}

          {!previewEnabled && (
            <Button
              {...buttonProps}
              type="button"
              onClick={handleSubmit}
              colorScheme={buttonProps?.variant ? undefined : "blue"}
              isDisabled={
                updateMutation.isPending ||
                (disableUnchanged && !form.formState.isDirty)
              }
              isLoading={updateMutation.isPending}
            >
              {buttonText}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};
