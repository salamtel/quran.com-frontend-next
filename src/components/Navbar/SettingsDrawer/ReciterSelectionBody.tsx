import { useState } from 'react';

import Fuse from 'fuse.js';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';

import IconSearch from '../../../../public/icons/search.svg';

import styles from './ReciterSelectionBody.module.scss';

import DataFetcher from 'src/components/DataFetcher';
import Input from 'src/components/dls/Forms/Input';
import RadioGroup, { RadioGroupOrientation } from 'src/components/dls/Forms/RadioGroup/RadioGroup';
import SpinnerContainer from 'src/components/dls/Spinner/SpinnerContainer';
import usePersistPreferenceGroup from 'src/hooks/usePersistPreferenceGroup';
import {
  selectAudioPlayerState,
  setReciterAndPauseAudio,
} from 'src/redux/slices/AudioPlayer/state';
import { makeAvailableRecitersUrl } from 'src/utils/apiPaths';
import { logEmptySearchResults, logItemSelectionChange } from 'src/utils/eventLogger';
import { RecitersResponse } from 'types/ApiResponses';
import PreferenceGroup from 'types/auth/PreferenceGroup';
import QueryParam from 'types/QueryParam';
import Reciter from 'types/Reciter';

export const filterReciters = (reciters, searchQuery: string): Reciter[] => {
  const fuse = new Fuse(reciters, {
    keys: ['name', 'languageName', 'translatedName.name', 'qirat.name', 'style.name'],
    threshold: 0.3,
  });

  const filteredReciter = fuse.search(searchQuery).map(({ item }) => item);
  if (!filteredReciter.length) {
    logEmptySearchResults(searchQuery, 'settings_drawer_translation');
  }
  return filteredReciter as Reciter[];
};

const DEFAULT_RECITATION_STYLE = 'Murattal';

const SettingsReciter = () => {
  const { lang, t } = useTranslation('common');
  const {
    actions: { onSettingsChange },
    isLoading,
  } = usePersistPreferenceGroup();
  const router = useRouter();
  const audioPlayerState = useSelector(selectAudioPlayerState);
  const { reciter: selectedReciter } = audioPlayerState;
  const [searchQuery, setSearchQuery] = useState('');

  // given the reciterId, get the full reciter object.
  // and setReciter in redux
  const onSelectedReciterChange = (reciterId: string, reciters: Reciter[]) => {
    if (!reciterId) return;
    const reciter = reciters.find((r) => r.id === Number(reciterId));
    logItemSelectionChange('selected_reciter', reciter.id);
    router.query[QueryParam.Reciter] = String(reciter.id);
    router.push(router, undefined, { shallow: true });
    onSettingsChange(
      'reciter',
      Number(reciterId),
      setReciterAndPauseAudio({ reciter, locale: lang }),
      setReciterAndPauseAudio({ reciter: audioPlayerState.reciter, locale: lang }),
      PreferenceGroup.AUDIO,
    );
  };

  return (
    <div>
      <div className={styles.searchInputContainer}>
        <SpinnerContainer isLoading={isLoading}>
          <Input
            prefix={<IconSearch />}
            id="translations-search"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('settings.search-reciter')}
            fixedWidth={false}
            containerClassName={styles.input}
          />
        </SpinnerContainer>
      </div>
      <DataFetcher
        queryKey={makeAvailableRecitersUrl(lang)}
        render={(data: RecitersResponse) => {
          const filteredReciters = searchQuery
            ? filterReciters(data.reciters, searchQuery)
            : data.reciters;

          return (
            <RadioGroup.Root
              label="reciter"
              orientation={RadioGroupOrientation.Vertical}
              value={selectedReciter.id.toString()}
              onChange={(newId) => onSelectedReciterChange(newId, data.reciters)}
            >
              {filteredReciters
                .sort((a, b) => (a.name > b.name ? 1 : -1))
                .map((reciter) => {
                  const reciterId = reciter.id.toString();
                  return (
                    <div className={styles.reciter} key={reciterId}>
                      <RadioGroup.Item value={reciterId} id={reciterId} />

                      <label htmlFor={reciterId} className={styles.reciterLabel}>
                        {reciter.translatedName.name}
                        {reciter.style.name !== DEFAULT_RECITATION_STYLE && (
                          <span className={styles.recitationStyle}>{reciter.style.name}</span>
                        )}
                      </label>
                    </div>
                  );
                })}
            </RadioGroup.Root>
          );
        }}
      />
    </div>
  );
};

export default SettingsReciter;
