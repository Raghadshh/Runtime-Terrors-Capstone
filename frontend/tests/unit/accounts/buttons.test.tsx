/// <reference types="jest" />
import { render, screen } from '@testing-library/react-native';
import { AccountButton } from '../../../src/features/accounts/AccountScreen';
import { colors } from '../../../src/features/accounts/theme';

it('keeps account button backgrounds and borders with NativeWind enabled', async () => {
  await render(<>
    <AccountButton label="Get Started" onPress={() => {}} />
    <AccountButton label="Log In" kind="secondary" onPress={() => {}} />
  </>);
  expect(screen.getByRole('button', { name: 'Get Started' })).toHaveStyle({
    backgroundColor: colors.green, height: 56, borderRadius: 20,
  });
  expect(screen.getByRole('button', { name: 'Log In' })).toHaveStyle({
    backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1.5,
  });
});
