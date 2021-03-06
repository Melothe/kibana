/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React, {
  Component, Fragment
} from 'react';

import {
  EuiTabbedContent,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { extractJobDetails } from './extract_job_details';
import { JsonPane } from './json_tab';
import { DatafeedPreviewPane } from './datafeed_preview_tab';
import { AnnotationsTable } from '../../../../components/annotations/annotations_table';
import { AnnotationFlyout } from '../../../../components/annotations/annotation_flyout';
import { ForecastsTable } from './forecasts_table';
import { JobDetailsPane } from './job_details_pane';
import { JobMessagesPane } from './job_messages_pane';
import { injectI18n } from '@kbn/i18n/react';

import chrome from 'ui/chrome';
const mlAnnotationsEnabled = chrome.getInjected('mlAnnotationsEnabled', false);

class JobDetailsUI extends Component {
  constructor(props) {
    super(props);

    this.state = {};
    if (this.props.addYourself) {
      this.props.addYourself(props.jobId, this);
    }
  }

  componentWillUnmount() {
    this.props.removeYourself(this.props.jobId);
  }

  static getDerivedStateFromProps(props) {
    const { job, loading } = props;
    return { job, loading };
  }

  render() {
    const { job } = this.state;
    if (job === undefined) {
      return (
        <div className="job-loading-spinner" data-test-subj="jobDetails loading">
          <EuiLoadingSpinner size="l"/>
        </div>
      );
    } else {

      const {
        general,
        customUrl,
        node,
        calendars,
        detectors,
        influencers,
        analysisConfig,
        analysisLimits,
        dataDescription,
        datafeed,
        counts,
        modelSizeStats,
        datafeedTimingStats
      } = extractJobDetails(job);

      const { intl, showFullDetails } = this.props;

      const tabs = [{
        id: 'job-settings',
        'data-test-subj': 'tab-job-settings',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.tabs.jobSettingsLabel',
          defaultMessage: 'Job settings'
        }),
        content: <JobDetailsPane data-test-subj="details-job-settings" sections={[general, customUrl, node, calendars]} />,
        time: job.open_time
      }, {
        id: 'job-config',
        'data-test-subj': 'tab-job-config',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.tabs.jobConfigLabel',
          defaultMessage: 'Job config'
        }),
        content: <JobDetailsPane
          data-test-subj="details-job-config"
          sections={[detectors, influencers, analysisConfig, analysisLimits, dataDescription]}
        />,
      }, {
        id: 'counts',
        'data-test-subj': 'tab-counts',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.tabs.countsLabel',
          defaultMessage: 'Counts'
        }),
        content: <JobDetailsPane data-test-subj="details-counts" sections={[counts, modelSizeStats]} />,
      }, {
        id: 'json',
        'data-test-subj': 'tab-json',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.tabs.jsonLabel',
          defaultMessage: 'JSON'
        }),
        content: <JsonPane  job={job} />,
      }, {
        id: 'job-messages',
        'data-test-subj': 'tab-job-messages',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.tabs.jobMessagesLabel',
          defaultMessage: 'Job messages'
        }),
        content: <JobMessagesPane job={job} />,
      },
      ];

      if (showFullDetails) {
        // Datafeed should be at index 2 in tabs array for full details
        tabs.splice(2, 0,  {
          id: 'datafeed',
          'data-test-subj': 'tab-datafeed',
          name: intl.formatMessage({
            id: 'xpack.ml.jobsList.jobDetails.tabs.datafeedLabel',
            defaultMessage: 'Datafeed'
          }),
          content: <JobDetailsPane data-test-subj="details-datafeed" sections={[datafeed, datafeedTimingStats]} />,
        });

        tabs.push({
          id: 'datafeed-preview',
          'data-test-subj': 'tab-datafeed-preview',
          name: intl.formatMessage({
            id: 'xpack.ml.jobsList.jobDetails.tabs.datafeedPreviewLabel',
            defaultMessage: 'Datafeed preview'
          }),
          content: <DatafeedPreviewPane job={job} />,
        }, {
          id: 'forecasts',
          'data-test-subj': 'tab-forecasts',
          name: intl.formatMessage({
            id: 'xpack.ml.jobsList.jobDetails.tabs.forecastsLabel',
            defaultMessage: 'Forecasts'
          }),
          content: <ForecastsTable job={job} />,
        });
      }

      if (mlAnnotationsEnabled && showFullDetails) {
        tabs.push({
          id: 'annotations',
          'data-test-subj': 'tab-annotations',
          name: intl.formatMessage({
            id: 'xpack.ml.jobsList.jobDetails.tabs.annotationsLabel',
            defaultMessage: 'Annotations'
          }),
          content: (
            <Fragment>
              <AnnotationsTable jobs={[job]} drillDown={true} />
              <AnnotationFlyout />
            </Fragment>
          ),
        });
      }

      return (
        <div className="tab-contents"  data-test-subj={`details details-${job.job_id}`}>
          <EuiTabbedContent
            tabs={tabs}
            initialSelectedTab={tabs[0]}
            onTabClick={() => { }}
          />
        </div>
      );
    }
  }
}
JobDetailsUI.propTypes = {
  jobId: PropTypes.string.isRequired,
  job: PropTypes.object,
  addYourself: PropTypes.func.isRequired,
  removeYourself: PropTypes.func.isRequired,
  showFullDetails: PropTypes.bool
};

export const JobDetails = injectI18n(JobDetailsUI);
